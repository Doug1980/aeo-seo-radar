import { generateRecommendations } from '../services/gemini.js'
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { audits } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { runPageSpeedAudit } from '../services/pagespeed.js'
import type { ApiResponse, DomainAudit } from '@aeo-seo-radar/shared'

export const auditRoutes = new Hono()

const createAuditSchema = z.object({
  domain: z.string().url({ message: 'Informe uma URL válida' }),
})

auditRoutes.post('/', zValidator('json', createAuditSchema), async (c) => {
  const { domain } = c.req.valid('json')

  // Cria auditoria com status running
  const [audit] = await db.insert(audits).values({
    domain,
    status: 'running',
    scores: { overall: 0, seo: 0, aeo: 0, performance: 0, schemaMarkup: 0 },
  }).returning()

  // Roda o PageSpeed em background
  runPageSpeedAudit(domain)
    .then(async (result) => {
  const overall = Math.round((result.performance + result.seo) / 2)

  const scores = {
    overall,
    seo: result.seo,
    aeo: result.seo,
    performance: result.performance,
    schemaMarkup: 0,
  }

  // Gera recomendações com Gemini
  let recommendations: string[] = []
  try {
    recommendations = await generateRecommendations(domain, scores)
    console.log(`🤖 Recomendações geradas:`, recommendations)
  } catch (err) {
    console.error('Gemini error:', err)
  }

  await db.update(audits)
  .set({
    status: 'completed',
    completedAt: new Date(),
    scores,
    recommendations,
  })
  .where(eq(audits.id, audit!.id))

  console.log(`✅ Auditoria concluída: ${domain} — Score: ${overall}`)
})
    .catch(async (err) => {
      await db.update(audits)
        .set({ status: 'failed' })
        .where(eq(audits.id, audit!.id))

      console.error(`❌ Auditoria falhou: ${domain}`, err.message)
    })

  const response: ApiResponse<DomainAudit> = {
    data: {
      id: audit!.id,
      domain: audit!.domain,
      status: audit!.status,
      createdAt: audit!.createdAt.toISOString(),
      scores: audit!.scores ?? { overall: 0, seo: 0, aeo: 0, performance: 0, schemaMarkup: 0 },
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