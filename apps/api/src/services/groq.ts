// apps/api/src/services/groq.ts
import { randomUUID } from "node:crypto";
import {
	type AuditFindings,
	type AuditScores,
	llmResponseSchema,
	type Recommendation,
} from "@aeo-seo-radar/shared";

interface GroqResponse {
	choices: { message: { content: string } }[];
}

/** Descreve os problemas concretos do HTML para o modelo priorizar. */
function describeFindings(f: AuditFindings): string {
	const lines = [
		`- Title: ${f.title ? `"${f.title}" (${f.titleLength} caracteres)` : "AUSENTE"}`,
		`- Meta description: ${f.metaDescription ? `presente (${f.metaDescriptionLength} caracteres)` : "AUSENTE"}`,
		`- H1 na página: ${f.h1Count === 0 ? "nenhum" : f.h1Count === 1 ? "1" : `${f.h1Count} (mais de um)`}`,
		`- Canonical: ${f.canonical ? "presente" : "ausente"}`,
		`- Atributo lang no <html>: ${f.lang ?? "ausente"}`,
		`- Meta robots: ${f.robots ?? "não definida"}`,
		`- Open Graph: título ${f.hasOgTitle ? "sim" : "não"}, descrição ${f.hasOgDescription ? "sim" : "não"}, imagem ${f.hasOgImage ? "sim" : "não"}`,
		`- Twitter Card: ${f.hasTwitterCard ? "sim" : "não"}`,
		`- Viewport (mobile): ${f.hasViewport ? "sim" : "não"}`,
		`- Schema JSON-LD: ${f.schemaTypes.length ? f.schemaTypes.join(", ") : "nenhum"}`,
	];
	if (f.isLikelyCSR) {
		lines.push(
			"- ATENÇÃO: o site parece renderizado no cliente (CSR); o HTML inicial pode estar subestimado.",
		);
	}
	return lines.join("\n");
}

export async function generateRecommendations(
	domain: string,
	scores: AuditScores,
	findings: AuditFindings,
): Promise<Recommendation[]> {
	const apiKey = process.env["GROQ_API_KEY"] ?? "";

	const prompt = `Você é um auditor sênior de SEO e AEO (Answer Engine Optimization).
Analise o diagnóstico do domínio "${domain}" e gere recomendações acionáveis.

Scores:
- Performance: ${scores.performance}/100
- SEO: ${scores.seo}/100
- AEO: ${scores.aeo}/100
- Schema Markup: ${scores.schemaMarkup}/100
- Score Geral: ${scores.overall}/100

Problemas detectados no HTML servido:
${describeFindings(findings)}

Responda SOMENTE com um objeto JSON válido (sem markdown, sem cercas de código):
{
  "recommendations": [
    {
      "title": "string curta e direta",
      "description": "1-2 frases: o problema e o ganho ao corrigir",
      "category": "seo" | "aeo" | "performance",
      "severity": "critical" | "warning" | "info",
      "impact": "high" | "medium" | "low",
      "effort": "high" | "medium" | "low",
      "steps": ["passo concreto 1", "passo concreto 2"]
    }
  ]
}

Regras:
- No máximo 8 recomendações, priorizando severity "critical".
- Baseie as recomendações nos "Problemas detectados" acima — cite o que
  realmente falta (ex.: meta description ausente, 0 H1, falta schema FAQPage).
- steps devem ser implementáveis, nunca genéricos.
- Escreva em português do Brasil.
- Não invente métricas além das fornecidas.`;

	let res: Response;
	try {
		res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				// Configurável por env: se a Groq descontinuar o modelo, basta
				// trocar GROQ_MODEL (sem mexer no código nem redeployar versão).
				model: process.env["GROQ_MODEL"] ?? "llama-3.3-70b-versatile",
				messages: [{ role: "user", content: prompt }],
				temperature: 0.3,
				max_tokens: 2000,
				response_format: { type: "json_object" },
			}),
		});
	} catch (err) {
		console.error("[groq] request failed:", err);
		return [];
	}

	if (!res.ok) {
		const err = (await res.json().catch(() => ({}))) as Record<string, unknown>;
		console.error(`[groq] API error ${res.status}:`, JSON.stringify(err));
		return [];
	}

	const data = (await res.json()) as GroqResponse;
	const text = data.choices?.[0]?.message?.content ?? "{}";
	const clean = text.replace(/```json|```/g, "").trim();

	let payload: unknown;
	try {
		payload = JSON.parse(clean);
	} catch {
		console.error("[groq] conteúdo não-JSON");
		return [];
	}

	const parsed = llmResponseSchema.safeParse(payload);
	if (!parsed.success) {
		console.error("[groq] schema inválido:", parsed.error.flatten());
		return [];
	}

	return parsed.data.recommendations.map((r: Omit<Recommendation, "id">) => ({ id: randomUUID(), ...r }));
}
