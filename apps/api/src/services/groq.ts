import type { AuditScores } from '@aeo-seo-radar/shared'

interface GroqResponse {
  choices: { message: { content: string } }[]
}

export async function generateRecommendations(
  domain: string,
  scores: AuditScores
): Promise<string[]> {
  const apiKey = process.env['GROQ_API_KEY'] ?? ''

  const prompt = `Você é um especialista em SEO e AEO (Answer Engine Optimization).
Analise os scores abaixo do domínio "${domain}" e gere 5 recomendações práticas e objetivas em português.

Scores:
- Performance: ${scores.performance}/100
- SEO: ${scores.seo}/100
- AEO: ${scores.aeo}/100
- Score Geral: ${scores.overall}/100

Retorne APENAS um array JSON com 5 strings, sem explicações extras. Exemplo:
["Recomendação 1", "Recomendação 2", "Recomendação 3", "Recomendação 4", "Recomendação 5"]`

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    }),
  })

  if (!res.ok) {
    const err = await res.json() as Record<string, unknown>
    throw new Error(`Groq API error: ${res.status} - ${JSON.stringify(err)}`)
  }

  const data = await res.json() as GroqResponse
  const text = data.choices?.[0]?.message?.content ?? '[]'
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}