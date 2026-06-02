import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { ApiResponse, DomainAudit } from '@aeo-seo-radar/shared'

export const auditRoutes = new Hono()

const createAuditSchema = z.object({
  domain: z.string().url({ message: 'Informe uma URL válida' }),
})

auditRoutes.post('/', zValidator('json', createAuditSchema), async (c) => {
  const { domain } = c.req.valid('json')

  const audit: DomainAudit = {
    id: crypto.randomUUID(),
    domain,
    status: 'pending',
    createdAt: new Date().toISOString(),
    scores: {
      overall: 0,
      seo: 0,
      aeo: 0,
      performance: 0,
      schemaMarkup: 0,
    },
  }

  const response: ApiResponse<DomainAudit> = {
    data: audit,
    message: 'Auditoria criada com sucesso',
  }

  return c.json(response, 201)
})

auditRoutes.get('/:id', (c) => {
  return c.json({ error: 'Not implemented', code: 'NOT_IMPLEMENTED' }, 501)
})