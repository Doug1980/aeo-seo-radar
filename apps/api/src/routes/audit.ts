import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { audits } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { startBackgroundAudit } from '../services/auditService.js'
import type { ApiResponse, DomainAudit } from '@aeo-seo-radar/shared'

export const auditRoutes = new Hono()

// ─── Contrato central de resposta ────────────────────────────────────────────
// Qualquer campo novo adicionado ao tipo DomainAudit deve vir aqui.
// O TypeScript avisa se algo estiver faltando — o compilador vira o guardião.
function toAuditResponse(audit: typeof audits.$inferSelect): DomainAudit {
  return {
    id: audit.id,
    domain: audit.domain,
    status: audit.status,
    createdAt: audit.createdAt.toISOString(),
    completedAt: audit.completedAt?.toISOString(),
    scores: audit.scores ?? { overall: 0, seo: 0, aeo: 0, performance: 0, schemaMarkup: 0 },
    recommendations: audit.recommendations ?? [],
  }
}

// ─── Schemas de validação ─────────────────────────────────────────────────────
const createAuditSchema = z.object({
  domain: z.string().url({ message: 'Informe uma URL válida' }),
})

// ─── POST / — Cria uma nova auditoria ────────────────────────────────────────
auditRoutes.post('/', zValidator('json', createAuditSchema), async (c) => {
  const { domain } = c.req.valid('json')

  const [audit] = await db.insert(audits).values({
    domain,
    status: 'pending',
    scores: { overall: 0, seo: 0, aeo: 0, performance: 0, schemaMarkup: 0 },
  }).returning()

  if (!audit) {
    return c.json({ error: 'Erro ao criar auditoria no banco' }, 500)
  }

  await db.update(audits)
    .set({ status: 'running' })
    .where(eq(audits.id, audit.id))

  // Dispara em background sem bloquear a resposta
  startBackgroundAudit(audit.id, domain)

  const response: ApiResponse<DomainAudit> = {
    data: toAuditResponse(audit),
  }

  return c.json(response, 201)
})

// ─── GET / — Lista as auditorias recentes ────────────────────────────────────
auditRoutes.get('/', async (c) => {
  const allAudits = await db.query.audits.findMany({
    orderBy: (audits, { desc }) => [desc(audits.createdAt)],
    limit: 20,
  })

  const response: ApiResponse<DomainAudit[]> = {
    data: allAudits.map(toAuditResponse),
  }

  return c.json(response)
})

// ─── GET /:id — Retorna uma auditoria completa (com recommendations) ─────────
auditRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')

  // Valida formato uuid antes de bater no banco
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return c.json({ error: 'Auditoria não encontrada', code: 'NOT_FOUND' }, 404)
  }

  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, id),
  })

  if (!audit) {
    return c.json({ error: 'Auditoria não encontrada', code: 'NOT_FOUND' }, 404)
  }

  const response: ApiResponse<DomainAudit> = {
    data: toAuditResponse(audit),
  }

  return c.json(response)
})