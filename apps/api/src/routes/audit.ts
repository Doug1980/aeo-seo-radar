import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { audits } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { startBackgroundAudit } from '../services/auditService.js'
import type { ApiResponse, DomainAudit } from '@aeo-seo-radar/shared'

export const auditRoutes = new Hono()

const createAuditSchema = z.object({
  domain: z.string().url({ message: 'Informe uma URL válida' }),
})

auditRoutes.post('/', zValidator('json', createAuditSchema), async (c) => {
  const { domain } = c.req.valid('json')

  // 1. Cria a auditoria com status pending inicial
  const [audit] = await db.insert(audits).values({
    domain,
    status: 'pending',
    scores: { overall: 0, seo: 0, aeo: 0, performance: 0, schemaMarkup: 0 },
  }).returning()

  if (!audit) {
    return c.json({ error: 'Erro ao criar auditoria no banco' }, 500)
  }

  // 2. Transiciona para running antes de disparar o processo
  await db.update(audits)
    .set({ status: 'running' })
    .where(eq(audits.id, audit.id))

  // 3. Dispara o serviço em background (sem await) para liberar a rota imediatamente
  startBackgroundAudit(audit.id, domain)

  // 4. Resposta síncrona imediata para o Frontend
  const response: ApiResponse<DomainAudit> = {
    data: {
      id: audit.id,
      domain: audit.domain,
      status: 'running', // Já informa o frontend que o processo começou
      createdAt: audit.createdAt.toISOString(),
      scores: audit.scores ?? { overall: 0, seo: 0, aeo: 0, performance: 0, schemaMarkup: 0 },
    },
    message: 'Auditoria iniciada',
  }

  return c.json(response, 201)
})

auditRoutes.get('/', async (c) => {
  const allAudits = await db.query.audits.findMany({
    orderBy: (audits, { desc }) => [desc(audits.createdAt)],
    limit: 20,
  })

  const response = {
    data: allAudits.map((audit) => ({
      id: audit.id,
      domain: audit.domain,
      status: audit.status,
      createdAt: audit.createdAt.toISOString(),
      completedAt: audit.completedAt?.toISOString(),
      scores: audit.scores ?? { overall: 0, seo: 0, aeo: 0, performance: 0, schemaMarkup: 0 },
    })),
  }

  return c.json(response)
})

auditRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')

  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, id),
  })

  if (!audit) {
    return c.json({ error: 'Auditoria não encontrada', code: 'NOT_FOUND' }, 404)
  }

  const response: ApiResponse<DomainAudit> = {
    data: {
      id: audit.id,
      domain: audit.domain,
      status: audit.status,
      createdAt: audit.createdAt.toISOString(),
      completedAt: audit.completedAt?.toISOString(),
      scores: audit.scores ?? { overall: 0, seo: 0, aeo: 0, performance: 0, schemaMarkup: 0 },
    },
  }

  return c.json(response)
})