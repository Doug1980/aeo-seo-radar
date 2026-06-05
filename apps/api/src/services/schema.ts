export interface SchemaResult {
  hasSchema: boolean
  types: string[]
  score: number
}

export async function analyzeSchema(url: string): Promise<SchemaResult> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AEORadar/1.0)',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    return { hasSchema: false, types: [], score: 0 }
  }

  const html = await res.text()

  // Extrai JSON-LD
  const jsonLdMatches = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  ) ?? []

  const types: string[] = []

  for (const match of jsonLdMatches) {
    try {
      const content = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')
      const parsed = JSON.parse(content)
      const typeValue = parsed['@type'] ?? parsed.type
      if (typeValue) {
        if (Array.isArray(typeValue)) types.push(...typeValue)
        else types.push(typeValue)
      }
    } catch {
      // ignora JSON inválido
    }
  }

  // Verifica Open Graph e meta tags
  const hasOgTitle = html.includes('og:title')
  const hasOgDescription = html.includes('og:description')
  const hasCanonical = html.includes('rel="canonical"')
  const hasMetaDescription = html.includes('name="description"')

  const hasSchema = types.length > 0

  // Calcula score AEO
  let score = 0
  if (hasSchema) score += 40
  if (types.includes('Organization') || types.includes('WebSite')) score += 15
  if (types.includes('FAQPage') || types.includes('QAPage')) score += 20
  if (types.includes('Article') || types.includes('BlogPosting')) score += 10
  if (hasOgTitle && hasOgDescription) score += 10
  if (hasCanonical) score += 5
  if (hasMetaDescription) score += 5
  if (score > 100) score = 100

  return { hasSchema, types: [...new Set(types)], score }
}