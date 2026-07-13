import type { Recommendation } from "@aeo-seo-radar/shared";

const SEVERITY_WEIGHT: Record<Recommendation["severity"], number> = {
	critical: 3,
	warning: 2,
	info: 1,
};

const LEVEL_WEIGHT: Record<Recommendation["impact"], number> = {
	high: 3,
	medium: 2,
	low: 1,
};

/**
 * Peso de prioridade: severidade domina, impacto desempata, e menor esforço
 * ganha no critério final (favorece "ganhos rápidos" no topo da lista).
 */
function priorityScore(r: Recommendation): number {
	return (
		SEVERITY_WEIGHT[r.severity] * 100 +
		LEVEL_WEIGHT[r.impact] * 10 +
		(4 - LEVEL_WEIGHT[r.effort])
	);
}

/** Ordena as recomendações do "faça primeiro" para o "faça depois". */
export function prioritize(recs: Recommendation[]): Recommendation[] {
	return [...recs].sort((a, b) => priorityScore(b) - priorityScore(a));
}

/** "Ganho rápido": muito impacto por pouco esforço. */
export function isQuickWin(r: Recommendation): boolean {
	return r.impact === "high" && r.effort === "low";
}
