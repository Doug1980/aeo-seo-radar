import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { audits } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import type { ApiResponse, DomainAudit } from '@aeo-seo-radar/shared'

export const auditRoutes = new Hono()

const createAuditSchema = z.object({
  domain: z.string().url({ message: 'Informe uma URL válida' }),
})

auditRoutes.post('/', zValidator('json', createAuditSchema), async (c) => {
  const { domain } = c.req.valid('json')

  const [audit] = await db.insert(audits).values({
    domain,
    status: 'pending',
    scores: {
      overall: 0,
      seo: 0,
      aeo: 0,
      performance: 0,
      schemaMarkup: 0,
    },
  }).returning()

  const response: ApiResponse<DomainAudit> = {
    data: {
      id: audit!.id,
      domain: audit!.domain,
      status: audit!.status,
      createdAt: audit!.createdAt.toISOString(),
      scores: audit!.scores ?? { overall: 0, seo: 0, aeo: 0, performance: 0, schemaMarkup: 0 },
    },
    message: 'Auditoria criada com sucesso',
  }

  return c.json(response, 201)
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