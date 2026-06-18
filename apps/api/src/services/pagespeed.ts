export interface PageSpeedResult {
	performance: number;
	seo: number;
	accessibility: number;
	bestPractices: number;
	lcp: number;
	fid: number;
	cls: number;
	ttfb: number;
}

// Erro tipado pra decidir se vale retry
class PageSpeedError extends Error {
	constructor(
		message: string,
		public retryable: boolean,
	) {
		super(message);
		this.name = "PageSpeedError";
	}
}

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1_500;
const TIMEOUT_MS = 60_000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Uma única tentativa de chamada ao PageSpeed
async function attemptPageSpeed(
	url: string,
	apiKey: string,
): Promise<PageSpeedResult> {
	const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=seo&category=accessibility&category=best-practices&key=${apiKey}`;

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		const res = await fetch(endpoint, { signal: controller.signal });

		if (!res.ok) {
			// 5xx e 429 são temporários → vale retry. 4xx (exceto 429) é definitivo.
			const retryable = res.status >= 500 || res.status === 429;
			throw new PageSpeedError(
				`PageSpeed API error: ${res.status} ${res.statusText}`,
				retryable,
			);
		}

		const data: any = await res.json();
		const categories = data.lighthouseResult?.categories;
		const audits = data.lighthouseResult?.audits;

		const fidValue =
			audits?.["max-potential-fid"]?.numericValue ??
			audits?.["total-blocking-time"]?.numericValue ??
			0;

		return {
			performance: Math.round((categories?.performance?.score ?? 0) * 100),
			seo: Math.round((categories?.seo?.score ?? 0) * 100),
			accessibility: Math.round((categories?.accessibility?.score ?? 0) * 100),
			bestPractices: Math.round(
				(categories?.["best-practices"]?.score ?? 0) * 100,
			),
			lcp: Math.round(audits?.["largest-contentful-paint"]?.numericValue ?? 0),
			fid: Math.round(fidValue),
			cls: audits?.["cumulative-layout-shift"]?.numericValue ?? 0,
			ttfb: Math.round(audits?.["server-response-time"]?.numericValue ?? 0),
		};
	} catch (error: any) {
		if (error.name === "AbortError") {
			// Timeout é sempre retryable
			throw new PageSpeedError(
				`PageSpeed audit timed out (Exceeded ${TIMEOUT_MS / 1000}s)`,
				true,
			);
		}
		if (error instanceof PageSpeedError) {
			throw error;
		}
		// Erro de rede (fetch falhou) → vale tentar de novo
		throw new PageSpeedError(
			`PageSpeed network error: ${error?.message || error}`,
			true,
		);
	} finally {
		clearTimeout(timeout);
	}
}

export async function runPageSpeedAudit(url: string): Promise<PageSpeedResult> {
	const apiKey = process.env["PAGESPEED_API_KEY"];
	if (!apiKey) {
		throw new Error("Missing PAGESPEED_API_KEY");
	}

	let lastError: unknown;

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			const result = await attemptPageSpeed(url, apiKey);
			return result;
		} catch (error) {
			lastError = error;
			const retryable = error instanceof PageSpeedError && error.retryable;
			const hasNextAttempt = attempt < MAX_ATTEMPTS;

			if (retryable && hasNextAttempt) {
				console.error(
					`⚠️ PageSpeed tentativa ${attempt} falhou (${(error as Error).message}). Retentando em ${RETRY_DELAY_MS}ms...`,
				);
				await sleep(RETRY_DELAY_MS);
				continue;
			}
			// Não-retryable, ou acabaram as tentativas
			throw error;
		}
	}

	throw lastError;
}
