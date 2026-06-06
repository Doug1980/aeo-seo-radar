import { db } from '../db/index.js'
import { audits } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { runPageSpeedAudit } from './pagespeed.js'
import { analyzeSchema } from './schema.js'
import { generateRecommendations } from './groq.js'
//import { generateRecommendations } from './gemini.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const console: { log: (...args: any[]) => void; error: (...args: any[]) => void }

export async function startBackgroundAudit(auditId: string, domain: string): Promise<void> {
  try {
    // PARALELISMO: Executa runPageSpeedAudit e analyzeSchema simultaneamente
    const [pageSpeedResult, schemaResult] = await Promise.all([
      runPageSpeedAudit(domain),
      analyzeSchema(domain).catch((err) => {
        console.error('Schema analysis error:', err)
        return { hasSchema: false, types: [] as string[], score: 0 }
      })
    ])

    console.log(`📋 Schema: ${schemaResult.types.join(', ') || 'nenhum'} — AEO: ${schemaResult.score}`)
    console.log(`⚡ PageSpeed: performance ${pageSpeedResult.performance}, seo ${pageSpeedResult.seo}`)

    // Cálculo dos scores consolidados
    const scores = {
      overall: Math.round((pageSpeedResult.performance + pageSpeedResult.seo + schemaResult.score) / 3),
      seo: pageSpeedResult.seo,
      aeo: schemaResult.score,
      performance: pageSpeedResult.performance,
      schemaMarkup: schemaResult.score,
    }

    // Geração de recomendações com Gemini (isolado para não quebrar o fluxo caso falhe)
    let recommendations: string[] = []
    try {
      recommendations = await generateRecommendations(domain, scores)
      console.log(`🤖 Recomendações geradas:`, recommendations)
    } catch (err) {
      console.error('Gemini error:', err)
    }

    // Atualiza o banco de dados com o sucesso da operação
    await db.update(audits)
      .set({
        status: 'completed',
        completedAt: new Date(),
        scores,
        recommendations,
      })
      .where(eq(audits.id, auditId))

    console.log(`✅ Auditoria concluída com sucesso: ${domain} — Score: ${scores.overall}`)

  } catch (err: any) {
    // Captura qualquer falha crítica no fluxo e marca como falho
    await db.update(audits)
      .set({ status: 'failed' })
      .where(eq(audits.id, auditId))

    console.error(`❌ Auditoria falhou em background para ${domain}:`, err?.message || err)
  }
}