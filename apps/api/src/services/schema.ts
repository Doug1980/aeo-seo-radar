export interface SchemaResult {
	hasSchema: boolean;
	types: string[];
	score: number;
	isLikelyCSR: boolean;
}

/**
 * Detecta se a página provavelmente é renderizada no cliente (CSR).
 *
 * Sites CSR (React/Vue/Angular sem SSR) entregam um HTML "casca": pouco
 * conteúdo visível e o trabalho real é feito por JavaScript no navegador.
 * Como esta análise lê o HTML cru (sem executar JS), schema e conteúdo
 * injetados via JavaScript não são detectados — o que pode gerar um score
 * artificialmente baixo. Sinalizar isso evita um falso negativo silencioso.
 *
 * Heurística (combina sinais, pois sem rodar o JS não há certeza absoluta):
 *  1. Pouco texto visível no body após remover scripts/styles
 *  2. Presença de containers-raiz vazios de framework (#root, #app, #__next)
 *  3. Alta proporção de <script> em relação ao conteúdo textual
 */
function detectCSR(html: string): boolean {
	// Remove scripts e styles para medir o texto "real" servido no HTML inicial
	const withoutScripts = html
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<style[\s\S]*?<\/style>/gi, "");
	// Remove todas as tags, sobra só o texto
	const visibleText = withoutScripts
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	// Sinal 1: HTML inicial entrega pouquíssimo texto
	const hasLittleText = visibleText.length < 500;

	// Sinal 2: containers-raiz típicos de SPAs
	const rootRegex =
		/<(?:div|main)[^>]*\bid=["'](?:root|app|__next|__nuxt|q-app)["'][^>]*>/i;
	const hasFrameworkRoot = rootRegex.test(html);

	// Sinal 3: muitos scripts relativos ao conteúdo
	const scriptCount = (html.match(/<script\b/gi) ?? []).length;
	const heavyScripts = scriptCount >= 3 && visibleText.length < 1500;

	// CSR provável quando há container de framework E o conteúdo é escasso,
	// ou quando o HTML é claramente uma casca (pouquíssimo texto + scripts)
	return (
		(hasFrameworkRoot && (hasLittleText || heavyScripts)) ||
		(hasLittleText && scriptCount >= 2)
	);
}

export async function analyzeSchema(url: string): Promise<SchemaResult> {
	const res = await fetch(url, {
		headers: {
			"User-Agent": "Mozilla/5.0 (compatible; AEORadar/1.0)",
		},
		signal: AbortSignal.timeout(10000),
	});
	if (!res.ok) {
		return { hasSchema: false, types: [], score: 0, isLikelyCSR: false };
	}
	const html = await res.text();

	const isLikelyCSR = detectCSR(html);

	// Extrai JSON-LD
	const jsonLdMatches =
		html.match(
			/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
		) ?? [];
	const types: string[] = [];
	for (const match of jsonLdMatches) {
		try {
			const content = match
				.replace(/<script[^>]*>/, "")
				.replace(/<\/script>/, "");
			const parsed = JSON.parse(content);
			const typeValue = parsed["@type"] ?? parsed.type;
			if (typeValue) {
				if (Array.isArray(typeValue)) types.push(...typeValue);
				else types.push(typeValue);
			}
		} catch {
			// ignora JSON inválido
		}
	}
	// Verifica Open Graph e meta tags
	const hasOgTitle = html.includes("og:title");
	const hasOgDescription = html.includes("og:description");
	const hasCanonical = html.includes('rel="canonical"');
	const hasMetaDescription = html.includes('name="description"');
	const hasSchema = types.length > 0;
	// Calcula score AEO
	let score = 0;
	if (hasSchema) score += 40;
	if (types.includes("Organization") || types.includes("WebSite")) score += 15;
	if (types.includes("FAQPage") || types.includes("QAPage")) score += 20;
	if (types.includes("Article") || types.includes("BlogPosting")) score += 10;
	if (hasOgTitle && hasOgDescription) score += 10;
	if (hasCanonical) score += 5;
	if (hasMetaDescription) score += 5;
	if (score > 100) score = 100;
	return { hasSchema, types: [...new Set(types)], score, isLikelyCSR };
}
