import type { AuditFindings } from "@aeo-seo-radar/shared";

export interface SchemaResult {
	hasSchema: boolean;
	types: string[];
	score: number;
	isLikelyCSR: boolean;
	findings: AuditFindings;
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

/** Remove tags e normaliza espaços de um trecho de HTML. */
function stripTags(s: string): string {
	return s
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/** Lê o valor de um atributo dentro de uma tag isolada. */
function attrValue(tag: string, name: string): string | null {
	const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"));
	return m?.[1]?.trim() ?? null;
}

/**
 * Retorna o `content` de uma <meta name|property="key">, em qualquer ordem
 * de atributos. Usado para description, Open Graph, Twitter, robots, viewport.
 */
function metaContent(html: string, key: string): string | null {
	const re = new RegExp(
		`<meta[^>]*(?:name|property)\\s*=\\s*["']${key}["'][^>]*>`,
		"i",
	);
	const tag = html.match(re)?.[0];
	return tag ? attrValue(tag, "content") : null;
}

/**
 * Extrai os sinais on-page do HTML servido (sem executar JS). É best-effort
 * por regex — mesma abordagem já usada para JSON-LD/CSR neste módulo.
 */
function extractOnPageSignals(
	html: string,
): Omit<AuditFindings, "schemaTypes" | "isLikelyCSR"> {
	const titleRaw = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null;
	const title = titleRaw ? stripTags(titleRaw) : null;

	const metaDescription = metaContent(html, "description");

	const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
	const h1Count = h1s.length;
	const h1Text = h1Count > 0 ? stripTags(h1s[0]?.[1] ?? "") || null : null;

	const canonicalTag = html.match(
		/<link[^>]*rel=["']canonical["'][^>]*>/i,
	)?.[0];
	const canonical = canonicalTag ? attrValue(canonicalTag, "href") : null;

	const lang =
		html.match(/<html[^>]*\blang=["']([^"']*)["']/i)?.[1]?.trim() ?? null;

	return {
		title,
		titleLength: title?.length ?? 0,
		metaDescription,
		metaDescriptionLength: metaDescription?.length ?? 0,
		h1Count,
		h1Text,
		canonical,
		lang,
		hasOgTitle: metaContent(html, "og:title") !== null,
		hasOgDescription: metaContent(html, "og:description") !== null,
		hasOgImage: metaContent(html, "og:image") !== null,
		hasTwitterCard: metaContent(html, "twitter:card") !== null,
		hasViewport: metaContent(html, "viewport") !== null,
		robots: metaContent(html, "robots"),
	};
}

/** Findings vazios — usados quando o fetch da página falha. */
export function emptyFindings(): AuditFindings {
	return {
		title: null,
		titleLength: 0,
		metaDescription: null,
		metaDescriptionLength: 0,
		h1Count: 0,
		h1Text: null,
		canonical: null,
		lang: null,
		hasOgTitle: false,
		hasOgDescription: false,
		hasOgImage: false,
		hasTwitterCard: false,
		hasViewport: false,
		robots: null,
		schemaTypes: [],
		isLikelyCSR: false,
	};
}

export async function analyzeSchema(url: string): Promise<SchemaResult> {
	const res = await fetch(url, {
		headers: {
			"User-Agent": "Mozilla/5.0 (compatible; AEORadar/1.0)",
		},
		signal: AbortSignal.timeout(10000),
	});
	if (!res.ok) {
		return {
			hasSchema: false,
			types: [],
			score: 0,
			isLikelyCSR: false,
			findings: emptyFindings(),
		};
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

	const uniqueTypes = [...new Set(types)];
	const findings: AuditFindings = {
		...extractOnPageSignals(html),
		schemaTypes: uniqueTypes,
		isLikelyCSR,
	};

	return { hasSchema, types: uniqueTypes, score, isLikelyCSR, findings };
}
