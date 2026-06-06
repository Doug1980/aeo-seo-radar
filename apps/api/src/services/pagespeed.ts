export interface PageSpeedResult {
  performance: number
  seo: number
  accessibility: number
  bestPractices: number
  lcp: number
  fid: number
  cls: number
  ttfb: number
}

export async function runPageSpeedAudit(url: string): Promise<PageSpeedResult> {
  const apiKey = process.env['PAGESPEED_API_KEY']

  if (!apiKey) {
    throw new Error('Missing PAGESPEED_API_KEY')
  }

  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=seo&category=accessibility&category=best-practices&key=${apiKey}`

  const controller = new AbortController()
  // A API do PageSpeed precisa de mais tempo. Elevado para 60 segundos.
  const timeout = setTimeout(() => controller.abort(), 60_000)

  try {
    const res = await fetch(endpoint, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`PageSpeed API error: ${res.status} ${res.statusText}`)
    }

    const data: any = await res.json()
    const categories = data.lighthouseResult?.categories
    const audits = data.lighthouseResult?.audits

    console.log('PageSpeed raw scores:', {
      performance: Math.round((categories?.performance?.score ?? 0) * 100),
      seo: Math.round((categories?.seo?.score ?? 0) * 100),
    })

    // Garante compatibilidade caso 'max-potential-fid' seja omitido em auditorias novas
    const fidValue = audits?.['max-potential-fid']?.numericValue ?? 
                     audits?.['total-blocking-time']?.numericValue ?? 0

    return {
      performance: Math.round((categories?.performance?.score ?? 0) * 100),
      seo: Math.round((categories?.seo?.score ?? 0) * 100),
      accessibility: Math.round((categories?.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((categories?.['best-practices']?.score ?? 0) * 100),
      lcp: Math.round(audits?.['largest-contentful-paint']?.numericValue ?? 0),
      fid: Math.round(fidValue),
      cls: audits?.['cumulative-layout-shift']?.numericValue ?? 0,
      ttfb: Math.round(audits?.['server-response-time']?.numericValue ?? 0),
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`PageSpeed audit timed out for URL: ${url} (Exceeded 60s)`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}