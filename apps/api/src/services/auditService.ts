import { randomUUID } from "node:crypto";
import type { Recommendation } from "@aeo-seo-radar/shared";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits } from "../db/schema.js";
import { generateRecommendations } from "./groq.js";
import { runPageSpeedAudit } from "./pagespeed.js";
import { analyzeSchema } from "./schema.js";

declare const console: {
	log: (...args: any[]) => void;
	error: (...args: any[]) => void;
};

/**
 * Recomendação especial injetada quando o site parece ser renderizado
 * no cliente (CSR). Como a análise lê o HTML cru (sem executar JS),
 * schema/conteúdo injetados via JavaScript não são detectados — então
 * avisamos o usuário de que o resultado pode estar subestimado.
 */
function buildCsrRecommendation(): Recommendation {
	return {
		id: randomUUID(),
		title: "Site renderizado no cliente (CSR) detectado",
		description:
			"O HTML inicial deste site tem pouco conteúdo — o conteúdo real provavelmente é montado por JavaScript no navegador (React, Vue, Angular sem SSR). Mecanismos de busca e de resposta por IA leem o HTML inicial, então schema markup e conteúdo injetados via JavaScript podem não ser indexados. Isso também significa que esta auditoria pode estar subestimando o site.",
		category: "aeo",
		severity: "warning",
		impact: "high",
		effort: "high",
		steps: [
			"Adote renderização no servidor (SSR) ou geração estática (SSG) — em Next.js, Nuxt ou similar — para entregar o conteúdo já no HTML inicial.",
			"Garanta que JSON-LD, Open Graph e meta tags estejam no HTML servido, não apenas injetados via JavaScript.",
			"Valide o resultado com o Google Rich Results Test e inspecione o 'HTML cru' (view-source) para confirmar que o conteúdo aparece sem executar scripts.",
		],
	};
}

export async function startBackgroundAudit(
	auditId: string,
	domain: string,
): Promise<void> {
	try {
		// Ambos isolados: a falha de um não derruba o outro
		const [pageSpeedResult, schemaResult] = await Promise.all([
			runPageSpeedAudit(domain).catch((err) => {
				console.error("PageSpeed error:", err?.message || err);
				return null; // sinaliza indisponível, sem quebrar a auditoria
			}),
			analyzeSchema(domain).catch((err) => {
				console.error("Schema analysis error:", err);
				return {
					hasSchema: false,
					types: [] as string[],
					score: 0,
					isLikelyCSR: false,
				};
			}),
		]);

		// Se o PageSpeed falhou, usa zeros mas mantém a auditoria viva
		const ps = pageSpeedResult ?? {
			performance: 0,
			seo: 0,
			accessibility: 0,
			bestPractices: 0,
		};
		const pageSpeedFailed = pageSpeedResult === null;

		// Score geral: média só do que está disponível
		const available = [
			!pageSpeedFailed ? ps.performance : null,
			!pageSpeedFailed ? ps.seo : null,
			schemaResult.score,
		].filter((v): v is number => v !== null);

		const overall = available.length
			? Math.round(available.reduce((a, b) => a + b, 0) / available.length)
			: 0;

		const scores = {
			overall,
			seo: ps.seo,
			aeo: schemaResult.score,
			performance: ps.performance,
			schemaMarkup: schemaResult.score,
			accessibility: ps.accessibility,
			bestPractices: ps.bestPractices,
		};

		// Core Web Vitals só existem quando o PageSpeed respondeu
		const metrics = pageSpeedResult
			? {
					lcp: pageSpeedResult.lcp,
					fid: pageSpeedResult.fid,
					cls: pageSpeedResult.cls,
					ttfb: pageSpeedResult.ttfb,
				}
			: null;

		let recommendations: Recommendation[] = [];
		try {
			recommendations = await generateRecommendations(domain, scores);
		} catch (err) {
			console.error("Groq error:", err);
		}

		// Se o site parece CSR, injeta o aviso no topo da lista de recomendações
		if (schemaResult.isLikelyCSR) {
			recommendations = [buildCsrRecommendation(), ...recommendations];
		}

		await db
			.update(audits)
			.set({
				status: "completed",
				completedAt: new Date(),
				scores,
				metrics,
				recommendations,
			})
			.where(eq(audits.id, auditId));
	} catch (err: any) {
		// Só cai aqui se algo realmente crítico quebrar (ex: banco)
		await db
			.update(audits)
			.set({ status: "failed" })
			.where(eq(audits.id, auditId));

		console.error(
			`Auditoria falhou em background para ${domain}:`,
			err?.message || err,
		);
	}
}
