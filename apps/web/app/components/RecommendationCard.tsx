"use client";

import type { Recommendation } from "@aeo-seo-radar/shared";
import { motion } from "framer-motion";
import { useState } from "react";

const severityConfig = {
	critical: { label: "Crítico", dot: "bg-red-500", text: "text-red-400" },
	warning: { label: "Atenção", dot: "bg-amber-500", text: "text-amber-400" },
	info: { label: "Sugestão", dot: "bg-sky-500", text: "text-sky-400" },
} as const;

// Fallback usado quando a severidade vier ausente ou fora do enum
// (ex.: auditorias antigas em formato string, ou alucinação do LLM).
const fallbackSeverity = {
	label: "Sugestão",
	dot: "bg-muted",
	text: "text-muted",
} as const;

const categoryLabel: Record<string, string> = {
	seo: "SEO",
	aeo: "AEO",
	performance: "Performance",
};

const levelLabel: Record<string, string> = {
	high: "Alto",
	medium: "Médio",
	low: "Baixo",
};

export default function RecommendationCard({
	recommendation: rec,
	index,
}: {
	recommendation: Recommendation;
	index: number;
}) {
	const [open, setOpen] = useState(false);

	// Blindagem: se a recomendação vier malformada (dado antigo, parsing
	// inesperado), não renderiza nada em vez de quebrar a página inteira.
	if (!rec || typeof rec !== "object") return null;

	// Blindagem do severityConfig: o acesso direto severityConfig[rec.severity]
	// retornava undefined para valores fora do enum, e ler `.dot` de undefined
	// derrubava todo o dashboard. O fallback garante um objeto sempre válido.
	const s = severityConfig[rec.severity] ?? fallbackSeverity;

	// Blindagem dos labels: valor desconhecido cai num texto neutro.
	const category = categoryLabel[rec.category] ?? "Geral";
	const impact = levelLabel[rec.impact] ?? "—";
	const effort = levelLabel[rec.effort] ?? "—";

	// Blindagem dos steps: garante que é sempre um array antes de .length/.map.
	const steps = Array.isArray(rec.steps) ? rec.steps : [];

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: index * 0.08 }}
			className="rounded-lg border border-border bg-surface-inset p-4"
		>
			<div className="flex items-start gap-3">
				<span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
				<div className="min-w-0 flex-1">
					<h4 className="font-medium text-text">
						{rec.title ?? "Recomendação"}
					</h4>
					{rec.description && (
						<p className="mt-1 text-sm text-muted">{rec.description}</p>
					)}

					<div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
						<span className={`font-medium ${s.text}`}>{s.label}</span>
						<span className="rounded px-2 py-0.5 bg-surface-raised text-muted">
							{category}
						</span>
						<span className="rounded px-2 py-0.5 bg-surface-raised text-muted">
							Impacto: {impact}
						</span>
						<span className="rounded px-2 py-0.5 bg-surface-raised text-muted">
							Esforço: {effort}
						</span>
					</div>

					{steps.length > 0 && (
						<>
							<button
								type="button"
								onClick={() => setOpen((v) => !v)}
								className="mt-3 flex items-center gap-1 text-sm font-medium text-muted hover:text-highlight cursor-pointer"
							>
								{steps.length} {steps.length === 1 ? "passo" : "passos"}
								<span
									className={`transition-transform ${open ? "rotate-180" : ""}`}
								>
									▾
								</span>
							</button>

							<motion.ol
								initial={false}
								animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
								className="list-decimal space-y-1.5 overflow-hidden pl-5 text-sm text-muted"
							>
								{steps.map((step, i) => (
									<li key={i} className="pt-2 first:pt-3">
										{step}
									</li>
								))}
							</motion.ol>
						</>
					)}
				</div>
			</div>
		</motion.div>
	);
}
