"use client";

import { useState } from "react";
import UserMenu from "./components/UserMenu";
import { useAuditFlow } from "./hooks/useAuditFlow";

function ScoreColor(score: number) {
	if (score >= 90) return "text-green-400";
	if (score >= 50) return "text-yellow-400";
	return "text-red-400";
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
		<main className="min-h-screen bg-gray-950 text-white p-8">
			<div className="max-w-5xl mx-auto">
				<div className="mb-10 flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-white">
							AEO & SEO Radar 📡
						</h1>
						<p className="text-gray-400 mt-1">
							Monitoramento e auditoria de presença digital
						</p>
					</div>
					<UserMenu />
				</div>

				<div className="bg-gray-900 rounded-xl p-6 mb-8 border border-gray-800">
					<h2 className="text-lg font-semibold mb-4">Nova Auditoria</h2>
					<div className="flex gap-3">
						<input
							type="url"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder="https://seusite.com.br"
							className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
						/>
						<button
							onClick={() => startAudit(url)}
							disabled={isPending || !url || isPolling}
							className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
						>
							{isPending || isPolling ? "Auditando..." : "Auditar"}
						</button>
					</div>
					{error && (
						<p className="text-red-400 text-sm mt-2">{error.message}</p>
					)}
				</div>

				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
					{scores.map((card) => (
						<div
							key={card.label}
							className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center"
						>
							<p className="text-gray-500 text-sm mb-1">{card.label}</p>
							{isPolling ? (
								// Skeleton animado enquanto a auditoria está rodando
								<div className="h-10 w-16 mx-auto rounded-lg bg-gray-700 animate-pulse" />
							) : (
								<p
									className={`text-4xl font-bold ${card.value !== undefined && card.value > 0 ? ScoreColor(card.value) : "text-gray-400"}`}
								>
									{card.value !== undefined && card.value > 0
										? card.value
										: "--"}
								</p>
							)}
						</div>
					))}
				</div>

				{currentAudit ? (
					<div className="mb-8">
						<div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
							<h3
								className={`font-semibold mb-3 ${currentAudit.status === "completed" ? "text-green-400" : currentAudit.status === "failed" ? "text-red-400" : "text-yellow-400"}`}
							>
								{currentAudit.status === "completed"
									? "✅ Auditoria concluída"
									: currentAudit.status === "failed"
										? "❌ Auditoria falhou"
										: "⏳ Auditando..."}
							</h3>
							<div className="text-sm text-gray-400 space-y-1">
								<p>
									<span className="text-gray-300">Domínio:</span>{" "}
									{currentAudit.domain}
								</p>
								<p>
									<span className="text-gray-300">Status:</span>{" "}
									{currentAudit.status}
								</p>
								<p>
									<span className="text-gray-300">Criado em:</span>{" "}
									{formatDate(currentAudit.createdAt)}
								</p>
							</div>
						</div>

						{isPolling && (
							// Skeleton das recommendations enquanto aguarda
							<div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-4">
								<div className="h-4 w-48 rounded bg-gray-700 animate-pulse mb-4" />
								<div className="space-y-3">
									{[1, 2, 3, 4, 5].map((i) => (
										<div
											key={i}
											className="h-3 rounded bg-gray-700 animate-pulse"
											style={{ width: `${70 + i * 5}%` }}
										/>
									))}
								</div>
							</div>
						)}

						{!isPolling &&
							currentAudit.recommendations &&
							currentAudit.recommendations.length > 0 && (
								<div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-4">
									<h3 className="font-semibold mb-4 text-blue-400">
										🤖 Recomendações da IA
									</h3>
									<ul className="space-y-3">
										{currentAudit.recommendations.map((rec, i) => (
											<li key={i} className="flex gap-3 text-sm text-gray-300">
												<span className="text-blue-400 font-bold shrink-0">
													{i + 1}.
												</span>
												<span>{rec}</span>
											</li>
										))}
									</ul>
								</div>
							)}
					</div>
				) : (
					<div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center mb-8">
						<p className="text-gray-500 text-lg">
							Insira uma URL acima para iniciar a auditoria
						</p>
					</div>
				)}

				{history && history.length > 0 && (
					<div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
						<h2 className="text-lg font-semibold mb-4">
							Histórico de Auditorias
						</h2>
						<div className="space-y-3">
							{history.map((item) => (
								<div
									key={item.id}
									onClick={() => selectAudit(item.id)}
									className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${item.id === selectedAuditId ? "bg-gray-700 border border-blue-500" : "bg-gray-800 hover:bg-gray-700"}`}
								>
									<div>
										<p className="text-sm text-white">{item.domain}</p>
										<p className="text-xs text-gray-500">
											{formatDate(item.createdAt)}
										</p>
									</div>
									<div className="flex gap-4 text-sm">
										<span
											className={
												item.scores?.overall > 0
													? ScoreColor(item.scores.overall)
													: "text-gray-500"
											}
										>
											{item.scores?.overall > 0 ? item.scores.overall : "--"}
										</span>
										<span
											className={`text-xs px-2 py-1 rounded ${item.status === "completed" ? "bg-green-900 text-green-400" : item.status === "failed" ? "bg-red-900 text-red-400" : "bg-yellow-900 text-yellow-400"}`}
										>
											{item.status}
										</span>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</main>
	);
}
