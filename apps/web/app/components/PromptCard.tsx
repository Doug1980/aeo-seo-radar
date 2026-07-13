"use client";

import type { DomainAudit } from "@aeo-seo-radar/shared";
import { Check, Copy, Sparkles } from "lucide-react";
import { useState } from "react";
import { buildRemediationPrompt } from "../lib/prompt";

export default function PromptCard({ audit }: { audit: DomainAudit }) {
	const [copied, setCopied] = useState(false);
	const prompt = buildRemediationPrompt(audit);

	async function copy() {
		try {
			await navigator.clipboard.writeText(prompt);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Clipboard indisponível (contexto inseguro): ignora silenciosamente.
		}
	}

	return (
		<div className="bg-surface-raised border border-border rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/30 p-6 mb-6">
			<div className="flex items-start justify-between gap-3 mb-3">
				<div className="flex items-center gap-2.5">
					<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow shadow-indigo-600/30">
						<Sparkles size={18} className="text-white" />
					</span>
					<div>
						<h3 className="font-display text-lg font-semibold text-text leading-tight">
							Prompt de correção pronto para IA
						</h3>
						<p className="text-sm text-muted mt-0.5">
							Cole no ChatGPT ou Claude e receba as correções aplicáveis.
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={copy}
					className="shrink-0 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-medium px-3.5 py-2 transition-all cursor-pointer"
				>
					{copied ? <Check size={16} /> : <Copy size={16} />}
					{copied ? "Copiado!" : "Copiar prompt"}
				</button>
			</div>
			<pre className="text-xs md:text-sm text-muted bg-surface-inset border border-border rounded-xl p-4 max-h-64 overflow-auto whitespace-pre-wrap font-mono leading-relaxed">
				{prompt}
			</pre>
		</div>
	);
}
