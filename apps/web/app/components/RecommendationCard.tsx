"use client";

import type { Recommendation } from "@aeo-seo-radar/shared";
import { motion } from "framer-motion";
import { useState } from "react";

const severityConfig = {
	critical: { label: "Crítico", dot: "bg-red-500", text: "text-red-400" },
	warning: { label: "Atenção", dot: "bg-amber-500", text: "text-amber-400" },
	info: { label: "Sugestão", dot: "bg-sky-500", text: "text-sky-400" },
} as const;

const categoryLabel: Record<Recommendation["category"], string> = {
	seo: "SEO",
	aeo: "AEO",
	performance: "Performance",
};

const levelLabel: Record<Recommendation["impact"], string> = {
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
	const s = severityConfig[rec.severity];

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: index * 0.08 }}
			className="rounded-lg border dark:border-gray-700 border-gray-200 dark:bg-gray-800/50 bg-gray-50 p-4"
		>
			<div className="flex items-start gap-3">
				<span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
				<div className="min-w-0 flex-1">
					<h4 className="font-medium dark:text-white text-gray-900">
						{rec.title}
					</h4>
					<p className="mt-1 text-sm dark:text-gray-400 text-gray-600">
						{rec.description}
					</p>

					<div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
						<span className={`font-medium ${s.text}`}>{s.label}</span>
						<span className="rounded px-2 py-0.5 dark:bg-gray-700 bg-gray-200 dark:text-gray-300 text-gray-600">
							{categoryLabel[rec.category]}
						</span>
						<span className="rounded px-2 py-0.5 dark:bg-gray-700 bg-gray-200 dark:text-gray-300 text-gray-600">
							Impacto: {levelLabel[rec.impact]}
						</span>
						<span className="rounded px-2 py-0.5 dark:bg-gray-700 bg-gray-200 dark:text-gray-300 text-gray-600">
							Esforço: {levelLabel[rec.effort]}
						</span>
					</div>

					{rec.steps.length > 0 && (
						<>
							<button
								type="button"
								onClick={() => setOpen((v) => !v)}
								className="mt-3 flex items-center gap-1 text-sm font-medium dark:text-gray-300 text-gray-700 hover:text-blue-400 cursor-pointer"
							>
								{rec.steps.length} {rec.steps.length === 1 ? "passo" : "passos"}
								<span
									className={`transition-transform ${open ? "rotate-180" : ""}`}
								>
									▾
								</span>
							</button>

							<motion.ol
								initial={false}
								animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
								className="list-decimal space-y-1.5 overflow-hidden pl-5 text-sm dark:text-gray-400 text-gray-600"
							>
								{rec.steps.map((step, i) => (
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
