// apps/api/src/services/groq.ts
import { randomUUID } from "node:crypto";
import {
	type AuditScores,
	llmResponseSchema,
	type Recommendation,
} from "@aeo-seo-radar/shared";

interface GroqResponse {
	choices: { message: { content: string } }[];
}

export async function generateRecommendations(
	domain: string,
	scores: AuditScores,
): Promise<Recommendation[]> {
	const apiKey = process.env["GROQ_API_KEY"] ?? "";

	const prompt = `Você é um auditor sênior de SEO e AEO (Answer Engine Optimization).
Analise os scores do domínio "${domain}" e gere recomendações acionáveis.

Scores:
- Performance: ${scores.performance}/100
- SEO: ${scores.seo}/100
- AEO: ${scores.aeo}/100
- Schema Markup: ${scores.schemaMarkup}/100
- Score Geral: ${scores.overall}/100

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
