import type { AuditScores } from '@aeo-seo-radar/shared'

export async function generateRecommendations(
  domain: string,
  scores: AuditScores
): Promise<string[]> {
  const apiKey = process.env['GEMINI_API_KEY'] ?? ''
  console.log('Gemini key length:', apiKey.length)

  const prompt = `
Você é um especialista em SEO e AEO (Answer Engine Optimization).
Analise os scores abaixo do domínio "${domain}" e gere 5 recomendações práticas e objetivas em português.

Scores:
- Performance: ${scores.performance}/100
- SEO: ${scores.seo}/100
- Score Geral: ${scores.overall}/100

Retorne APENAS um array JSON com 5 strings, sem explicações extras. Exemplo:
["Recomendação 1", "Recomendação 2", "Recomendação 3", "Recomendação 4", "Recomendação 5"]
`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  )

  if (!res.ok) {
  const errBody = await res.json()
  throw new Error(`Gemini API error: ${res.status} - ${JSON.stringify(errBody)}`)
}

  const data: any = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'


  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}