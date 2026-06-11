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
				return { hasSchema: false, types: [] as string[], score: 0 };
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

		console.log(
			`📋 Schema: ${schemaResult.types.join(", ") || "nenhum"} — AEO: ${schemaResult.score}`,
		);
		console.log(
			`⚡ PageSpeed: ${pageSpeedFailed ? "INDISPONÍVEL" : `performance ${ps.performance}, seo ${ps.seo}`}`,
		);

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
		};

		let recommendations: string[] = [];
		try {
			recommendations = await generateRecommendations(domain, scores);
			console.log(`🤖 Recomendações geradas:`, recommendations);
		} catch (err) {
			console.error("Groq error:", err);
		}

		await db
			.update(audits)
			.set({
				status: "completed",
				completedAt: new Date(),
				scores,
				recommendations,
			})
			.where(eq(audits.id, auditId));

		console.log(
			`✅ Auditoria concluída: ${domain} — Score: ${overall}${pageSpeedFailed ? " (PageSpeed indisponível)" : ""}`,
		);
	} catch (err: any) {
		// Só cai aqui se algo realmente crítico quebrar (ex: banco)
		await db
			.update(audits)
			.set({ status: "failed" })
			.where(eq(audits.id, auditId));

		console.error(
			`❌ Auditoria falhou em background para ${domain}:`,
			err?.message || err,
		);
	}
}
