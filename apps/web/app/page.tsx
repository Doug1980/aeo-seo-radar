"use client";
import RecommendationCard from "./components/RecommendationCard";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import ThemeToggle from "./components/ThemeToggle";
import UserMenu from "./components/UserMenu";
import { useAuditFlow } from "./hooks/useAuditFlow";

function ScoreColor(score: number) {
	if (score >= 90) return "text-green-400";
	if (score >= 50) return "text-yellow-400";
	return "text-red-400";
}

function isPageSpeedUnavailable(scores?: { seo: number; performance: number }) {
	return !!scores && scores.performance === 0 && scores.seo === 0;
}

function aeoHint(aeo?: number) {
	if (aeo === undefined) return null;
	if (aeo === 0)
		return "A pontuação de AEO é zero porque nenhum dado estruturado (schema markup) foi detectado neste site — o que reduz sua visibilidade em motores de resposta e ferramentas de IA.";
	if (aeo < 50)
		return "Schema markup parcial ou incompleto. Ampliar os dados estruturados melhora a presença em AEO.";
	return null;
}

function formatDate(iso: string) {
	return new Intl.DateTimeFormat("pt-BR", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "UTC",
	}).format(new Date(iso));
}

function AnimatedScore({ value }: { value: number }) {
	const [display, setDisplay] = useState(0);

	useEffect(() => {
		if (value === 0) {
			setDisplay(0);
			return;
		}
		let start = 0;
		const duration = 800;
		const step = 16;
		const increment = value / (duration / step);
		const timer = setInterval(() => {
			start += increment;
			if (start >= value) {
				setDisplay(value);
				clearInterval(timer);
			} else {
				setDisplay(Math.floor(start));
			}
		}, step);
		return () => clearInterval(timer);
	}, [value]);

	return <>{display}</>;
}

export default function Home() {
	const [url, setUrl] = useState("");

	const {
		currentAudit,
		history,
		isPolling,
		isPending,
		error,
		selectedAuditId,
		selectAudit,
		startAudit,
	} = useAuditFlow();

	const scores = [
		{ label: "Score Geral", value: currentAudit?.scores?.overall },
		{ label: "SEO", value: currentAudit?.scores?.seo },
		{ label: "AEO", value: currentAudit?.scores?.aeo },
		{ label: "Performance", value: currentAudit?.scores?.performance },
	];

	return (
		<main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white px-4 py-6 md:p-8">
			<div className="max-w-5xl mx-auto">
				{/* Header */}
				<motion.div
					className="mb-8 flex items-center justify-between"
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4 }}
				>
					<div>
						<h1 className="text-2xl md:text-3xl font-bold dark:text-white text-gray-900">
							AEO & SEO Radar 📡
						</h1>
						<p className="dark:text-gray-400 text-gray-500 mt-1 text-sm md:text-base">
							Monitoramento e auditoria de presença digital
						</p>
					</div>
					<div className="flex items-center gap-2">
						<ThemeToggle />
						<UserMenu />
					</div>
				</motion.div>

				{/* Nova Auditoria */}
				<motion.div
					className="dark:bg-gray-900 bg-white rounded-xl p-4 md:p-6 mb-6 dark:border-gray-800 border-gray-200 border"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.1 }}
				>
					<h2 className="text-lg font-semibold mb-3 dark:text-white text-gray-900">
						Nova Auditoria
					</h2>
					<div className="flex flex-col sm:flex-row gap-3">
						<input
							type="url"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder="https://seusite.com.br"
							className="flex-1 dark:bg-gray-800 bg-gray-100 dark:border-gray-700 border-gray-300 border rounded-lg px-4 py-2.5 dark:text-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500"
						/>
						<button
							type="button"
							onClick={() => startAudit(url)}
							disabled={isPending || !url || isPolling}
							className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap"
						>
							{isPending || isPolling ? "Auditando..." : "Auditar"}
						</button>
					</div>
					{error && (
						<p className="text-red-400 text-sm mt-2">{error.message}</p>
					)}
				</motion.div>

				{/* Cards de Score */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
					{scores.map((card, index) => {
						const psDown = isPageSpeedUnavailable(currentAudit?.scores);
						const dependsOnPageSpeed = [
							"SEO",
							"Performance",
							"Score Geral",
						].includes(card.label);
						const showNA = psDown && dependsOnPageSpeed;

						return (
							<motion.div
								key={card.label}
								className="dark:bg-gray-900 bg-white dark:border-gray-800 border-gray-200 border rounded-xl p-4 text-center"
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.3, delay: 0.2 + index * 0.07 }}
							>
								<p className="dark:text-gray-500 text-gray-400 text-xs mb-1">
									{card.label}
								</p>
								{isPolling ? (
									<div className="h-8 w-14 mx-auto rounded-lg dark:bg-gray-700 bg-gray-200 animate-pulse" />
								) : showNA ? (
									<p
										className="text-xl font-bold text-gray-500"
										title="Não foi possível medir"
									>
										N/D
									</p>
								) : (
									<p
										className={`text-3xl md:text-4xl font-bold ${card.value !== undefined ? ScoreColor(card.value) : "text-gray-400"}`}
									>
										{card.value !== undefined ? (
											<AnimatedScore value={card.value} />
										) : (
											"--"
										)}
									</p>
								)}
							</motion.div>
						);
					})}
				</div>

				{/* Status da Auditoria */}
				<AnimatePresence mode="wait">
					{currentAudit ? (
						<motion.div
							key="audit-result"
							className="mb-6"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.4 }}
						>
							<div className="dark:bg-gray-900 bg-white dark:border-gray-800 border-gray-200 border rounded-xl p-4 md:p-6">
								<h3
									className={`font-semibold mb-3 ${currentAudit.status === "completed" ? "text-green-400" : currentAudit.status === "failed" ? "text-red-400" : "text-yellow-400"}`}
								>
									{currentAudit.status === "completed"
										? isPageSpeedUnavailable(currentAudit.scores)
											? "⚠️ Auditoria concluída parcialmente"
											: "✅ Auditoria concluída"
										: currentAudit.status === "failed"
											? "❌ Auditoria falhou"
											: "⏳ Auditando..."}
								</h3>
								<div className="text-sm dark:text-gray-400 text-gray-500 space-y-1">
									<p>
										<span className="dark:text-gray-300 text-gray-700">
											Domínio:
										</span>{" "}
										<span className="break-all">{currentAudit.domain}</span>
									</p>
									<p>
										<span className="dark:text-gray-300 text-gray-700">
											Status:
										</span>{" "}
										{currentAudit.status}
									</p>
									<p>
										<span className="dark:text-gray-300 text-gray-700">
											Criado em:
										</span>{" "}
										{formatDate(currentAudit.createdAt)}
									</p>
								</div>

								{currentAudit.status === "completed" &&
									isPageSpeedUnavailable(currentAudit.scores) && (
										<motion.div
											className="mt-4 bg-amber-950/40 border border-amber-800/50 rounded-lg p-3 text-sm text-amber-300"
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{ delay: 0.3 }}
										>
											A análise de performance e SEO técnico (PageSpeed) não
											pôde ser concluída para este site — provavelmente por ser
											muito grande ou lento. As métricas de AEO e as
											recomendações abaixo seguem válidas.
										</motion.div>
									)}

								{currentAudit.status === "completed" &&
									!isPageSpeedUnavailable(currentAudit.scores) &&
									aeoHint(currentAudit.scores?.aeo) && (
										<motion.div
											className="mt-4 bg-blue-950/40 border border-blue-800/50 rounded-lg p-3 text-sm text-blue-300"
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{ delay: 0.3 }}
										>
											{aeoHint(currentAudit.scores?.aeo)}
										</motion.div>
									)}
							</div>

							{isPolling && (
								<div className="dark:bg-gray-900 bg-white dark:border-gray-800 border-gray-200 border rounded-xl p-4 md:p-6 mt-4">
									<div className="h-4 w-48 rounded dark:bg-gray-700 bg-gray-200 animate-pulse mb-4" />
									<div className="space-y-3">
										{[1, 2, 3, 4, 5].map((i) => (
											<div
												key={i}
												className="h-3 rounded dark:bg-gray-700 bg-gray-200 animate-pulse"
												style={{ width: `${70 + i * 5}%` }}
											/>
										))}
									</div>
								</div>
							)}

							<AnimatePresence>
								{!isPolling &&
									currentAudit.recommendations &&
									currentAudit.recommendations.length > 0 && (
										<motion.div
											className="dark:bg-gray-900 bg-white dark:border-gray-800 border-gray-200 border rounded-xl p-4 md:p-6 mt-4"
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ duration: 0.4 }}
										>
											<h3 className="font-semibold mb-4 text-blue-400">
												🤖 Recomendações da IA
											</h3>
									<div className="space-y-3">
										{currentAudit.recommendations.map((rec, i) => (
											<RecommendationCard key={rec.id ?? i} recommendation={rec} index={i} />
										))}
									</div>
										</motion.div>
									)}
							</AnimatePresence>
						</motion.div>
					) : (
						<motion.div
							key="empty-state"
							className="dark:bg-gray-900 bg-white dark:border-gray-800 border-gray-200 border rounded-xl p-8 md:p-12 text-center mb-6"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.4, delay: 0.3 }}
						>
							<p className="dark:text-gray-500 text-gray-400 text-base md:text-lg">
								Insira uma URL acima para iniciar a auditoria
							</p>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Histórico */}
				<AnimatePresence>
					{history && history.length > 0 && (
						<motion.div
							className="dark:bg-gray-900 bg-white dark:border-gray-800 border-gray-200 border rounded-xl p-4 md:p-6"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, delay: 0.4 }}
						>
							<h2 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">
								Histórico de Auditorias
							</h2>
							<div className="space-y-3">
								{history.map((item, index) => (
									<motion.div
										key={item.id}
										onClick={() => selectAudit(item.id)}
										className={`flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer transition-colors ${item.id === selectedAuditId ? "dark:bg-gray-700 bg-blue-50 border border-blue-500" : "dark:bg-gray-800 bg-gray-100 dark:hover:bg-gray-700 hover:bg-gray-200"}`}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ duration: 0.3, delay: index * 0.05 }}
										whileHover={{ scale: 1.01 }}
										whileTap={{ scale: 0.99 }}
									>
										<div className="min-w-0 flex-1">
											<p className="text-sm dark:text-white text-gray-900 truncate">
												{item.domain}
											</p>
											<p className="text-xs dark:text-gray-500 text-gray-400">
												{formatDate(item.createdAt)}
											</p>
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<span
												className={`text-sm font-medium ${isPageSpeedUnavailable(item.scores) ? "text-gray-500" : item.scores?.overall !== undefined ? ScoreColor(item.scores.overall) : "text-gray-500"}`}
											>
												{isPageSpeedUnavailable(item.scores)
													? "N/D"
													: item.scores?.overall !== undefined
														? item.scores.overall
														: "--"}
											</span>
											<span
												className={`text-xs px-2 py-1 rounded whitespace-nowrap ${item.status === "completed" ? "bg-green-900 text-green-400" : item.status === "failed" ? "bg-red-900 text-red-400" : "bg-yellow-900 text-yellow-400"}`}
											>
												{item.status}
											</span>
										</div>
									</motion.div>
								))}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</main>
	);
}
