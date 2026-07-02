"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
	AlertTriangle,
	Bot,
	CheckCircle2,
	Loader2,
	Radar,
	Search,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import AuditProgress from "./components/AuditProgress";
import RecommendationCard from "./components/RecommendationCard";
import ThemeToggle from "./components/ThemeToggle";
import UserMenu from "./components/UserMenu";
import { useAuditFlow } from "./hooks/useAuditFlow";

// Classe base dos cards/painéis — elevação + cantos do novo visual.
const CARD =
	"bg-surface-raised border border-border rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/30";

function ScoreColor(score: number) {
	if (score >= 90) return "text-green-600 dark:text-green-400";
	if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
	return "text-red-600 dark:text-red-400";
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

function formatSeconds(ms: number) {
	return `${(ms / 1000).toFixed(2)} s`;
}

type MetricTone = "good" | "warn" | "bad";

// Classifica a métrica em bom/precisa-melhorar/ruim a partir dos limites do Google.
function metricStatus(
	value: number,
	goodMax: number,
	warnMax: number,
): MetricTone {
	if (value <= goodMax) return "good";
	if (value <= warnMax) return "warn";
	return "bad";
}

const toneClass: Record<MetricTone, string> = {
	good: "bg-green-500/15 text-green-400",
	warn: "bg-yellow-500/15 text-yellow-400",
	bad: "bg-red-500/15 text-red-400",
};

const toneLabel: Record<MetricTone, string> = {
	good: "Bom",
	warn: "Precisa melhorar",
	bad: "Ruim",
};

function buildMetricItems(metrics: {
	lcp: number;
	fid: number;
	cls: number;
	ttfb: number;
}) {
	return [
		{
			label: "LCP",
			value: formatSeconds(metrics.lcp),
			title: "Velocidade de carregamento",
			desc: "Quanto tempo leva para a parte principal da página aparecer na tela.",
			ideal: "ideal: até 2,5 s",
			status: metricStatus(metrics.lcp, 2500, 4000),
		},
		{
			label: "TTFB",
			value: `${Math.round(metrics.ttfb)} ms`,
			title: "Resposta do servidor",
			desc: "Quanto o servidor do site demora para começar a responder.",
			ideal: "ideal: até 800 ms",
			status: metricStatus(metrics.ttfb, 800, 1800),
		},
		{
			label: "TBT/FID",
			value: `${Math.round(metrics.fid)} ms`,
			title: "Resposta ao toque",
			desc: "Quanto a página demora para reagir quando você clica ou toca.",
			ideal: "ideal: até 200 ms",
			status: metricStatus(metrics.fid, 200, 600),
		},
		{
			label: "CLS",
			value: metrics.cls.toFixed(3),
			title: "Estabilidade visual",
			desc: "O quanto os elementos 'pulam' de lugar enquanto a página carrega.",
			ideal: "ideal: até 0,1",
			status: metricStatus(metrics.cls, 0.1, 0.25),
		},
	];
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

// Favicon do site auditado, via serviço do Google (não exige backend).
function faviconFor(domain: string) {
	try {
		const host = new URL(domain).hostname;
		return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
	} catch {
		return null;
	}
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

// Anel de score — o elemento "herói" da página. Grande, animado, colorido por estado.
function ScoreRing({
	value,
	isLoading,
	na,
}: {
	value?: number;
	isLoading?: boolean;
	na?: boolean;
}) {
	const size = 208;
	const stroke = 14;
	const r = (size - stroke) / 2;
	const c = 2 * Math.PI * r;
	const pct = Math.max(0, Math.min(100, value ?? 0));
	const dash = (pct / 100) * c;
	const hasValue = value !== undefined && !na;
	const colorClass = hasValue ? ScoreColor(value) : "text-muted";

	return (
		<div
			className="relative shrink-0"
			style={{ width: size, height: size }}
		>
			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				className={colorClass}
				aria-hidden="true"
			>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke="var(--surface-inset)"
					strokeWidth={stroke}
				/>
				{hasValue && !isLoading && (
					<circle
						cx={size / 2}
						cy={size / 2}
						r={r}
						fill="none"
						stroke="currentColor"
						strokeWidth={stroke}
						strokeLinecap="round"
						strokeDasharray={c}
						strokeDashoffset={c - dash}
						transform={`rotate(-90 ${size / 2} ${size / 2})`}
						style={{
							transition: "stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)",
						}}
					/>
				)}
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				{isLoading ? (
					<div className="h-14 w-20 rounded-lg bg-surface-inset animate-pulse" />
				) : na ? (
					<span className="text-3xl font-bold text-muted">N/D</span>
				) : (
					<>
						<span
							className={`font-display text-6xl font-bold tabular-nums tracking-tight leading-none ${colorClass}`}
						>
							{value !== undefined ? <AnimatedScore value={value} /> : "--"}
						</span>
						<span className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
							Score Geral
						</span>
					</>
				)}
			</div>
		</div>
	);
}

// Barra de score para as métricas de apoio (SEO, AEO, etc.).
function StatBar({
	label,
	value,
	isLoading,
	na,
}: {
	label: string;
	value?: number;
	isLoading?: boolean;
	na?: boolean;
}) {
	const hasValue = value !== undefined && !na;
	const colorClass = hasValue ? ScoreColor(value) : "text-muted";
	const display = na ? "N/D" : value !== undefined ? value : "--";

	return (
		<div className="flex items-center gap-3">
			<span className="w-24 shrink-0 truncate text-sm text-muted sm:w-28">
				{label}
			</span>
			<div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-inset">
				{isLoading ? (
					<div className="h-full w-1/3 animate-pulse rounded-full bg-border" />
				) : (
					hasValue && (
						<motion.div
							className={`h-full rounded-full bg-current ${colorClass}`}
							initial={{ width: 0 }}
							animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
							transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
						/>
					)
				)}
			</div>
			<span
				className={`w-9 shrink-0 text-right text-sm font-semibold tabular-nums ${colorClass}`}
			>
				{display}
			</span>
		</div>
	);
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
		hasNextPage,
		fetchNextPage,
		isFetchingNextPage,
	} = useAuditFlow();

	const psDown = isPageSpeedUnavailable(currentAudit?.scores);
	const overall = currentAudit?.scores?.overall;

	// Métricas de apoio (o Score Geral é o anel herói acima).
	const supporting: { label: string; value?: number; na: boolean }[] = [
		{ label: "SEO", value: currentAudit?.scores?.seo, na: psDown },
		{ label: "AEO", value: currentAudit?.scores?.aeo, na: false },
		{
			label: "Performance",
			value: currentAudit?.scores?.performance,
			na: psDown,
		},
		{
			label: "Acessibilidade",
			value: currentAudit?.scores?.accessibility,
			na: psDown,
		},
		{
			label: "Boas Práticas",
			value: currentAudit?.scores?.bestPractices,
			na: psDown,
		},
	];

	return (
		<main
			className="min-h-screen bg-surface text-text px-4 py-6 md:p-8"
			style={{
				background:
					"radial-gradient(1100px 480px at 50% -10%, rgba(99,102,241,0.20), transparent 68%), var(--surface)",
			}}
		>
			<div className="max-w-5xl mx-auto">
				{/* Header */}
				<motion.div
					className="mb-8 flex items-center justify-between"
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4 }}
				>
					<div className="flex items-center gap-3">
						<span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-600/30">
							<Radar size={22} className="text-white" />
						</span>
						<div>
							<h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight leading-none">
								<span className="bg-gradient-to-r from-slate-900 to-indigo-600 dark:from-white dark:to-indigo-300 bg-clip-text text-transparent">
									AEO &amp; SEO Radar
								</span>
							</h1>
							<p className="text-muted mt-1.5 text-sm">
								Monitoramento e auditoria de presença digital
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<ThemeToggle />
						<UserMenu />
					</div>
				</motion.div>

				{/* Command bar — ação primária, com presença */}
				<motion.div
					className="mb-6"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.1 }}
				>
					<div
						className={`${CARD} flex items-center gap-2 p-2 pl-4 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 transition`}
					>
						<Search size={20} className="shrink-0 text-muted" />
						<input
							type="url"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && url && !isPending && !isPolling)
									startAudit(url);
							}}
							placeholder="https://seusite.com.br"
							className="flex-1 bg-transparent px-1 py-2 text-base md:text-lg text-text placeholder-muted focus:outline-none"
						/>
						<button
							type="button"
							onClick={() => startAudit(url)}
							disabled={isPending || !url || isPolling}
							className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 md:px-7 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-600/30 transition-all cursor-pointer whitespace-nowrap"
						>
							{isPending || isPolling ? "Auditando..." : "Auditar"}
						</button>
					</div>
					{error && <p className="text-red-400 text-sm mt-2 px-1">{error.message}</p>}
				</motion.div>

				{/* Painel de scores — anel herói + barras de apoio */}
				<motion.div
					className={`${CARD} p-6 md:p-8 mb-6`}
					initial={{ opacity: 0, scale: 0.98 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.4, delay: 0.2 }}
				>
					<div className="grid items-center gap-8 md:grid-cols-[auto_1fr] md:gap-12">
						<div className="flex justify-center">
							<ScoreRing
								value={overall}
								isLoading={isPolling}
								na={psDown && overall !== undefined}
							/>
						</div>
						<div className="w-full space-y-4">
							{supporting.map((s) => (
								<StatBar
									key={s.label}
									label={s.label}
									value={s.value}
									isLoading={isPolling}
									na={s.na}
								/>
							))}
						</div>
					</div>
				</motion.div>

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
							<div className={`${CARD} p-4 md:p-6`}>
								<h3
									className={`font-semibold mb-3 flex items-center gap-2 ${currentAudit.status === "completed" ? "text-green-400" : currentAudit.status === "failed" ? "text-red-400" : "text-yellow-400"}`}
								>
									{currentAudit.status === "completed" ? (
										isPageSpeedUnavailable(currentAudit.scores) ? (
											<>
												<AlertTriangle size={20} />
												Auditoria concluída parcialmente
											</>
										) : (
											<>
												<CheckCircle2 size={20} />
												Auditoria concluída
											</>
										)
									) : currentAudit.status === "failed" ? (
										<>
											<XCircle size={20} />
											Auditoria falhou
										</>
									) : (
										<>
											<Loader2 size={20} className="animate-spin" />
											Auditando...
										</>
									)}
								</h3>
								<div className="text-sm text-muted space-y-1">
									<p>
										<span className="text-text">Domínio:</span>{" "}
										<span className="break-all">{currentAudit.domain}</span>
									</p>
									<p>
										<span className="text-text">Status:</span>{" "}
										{currentAudit.status}
									</p>
									<p>
										<span className="text-text">Criado em:</span>{" "}
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
											className="mt-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200"
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{ delay: 0.3 }}
										>
											{aeoHint(currentAudit.scores?.aeo)}
										</motion.div>
									)}

								{currentAudit.status === "completed" &&
									currentAudit.metrics && (
										<motion.div
											className="mt-4"
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{ delay: 0.3 }}
										>
											<p className="text-xs text-muted mb-2">
												Core Web Vitals (mobile)
											</p>
											<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-start">
												{buildMetricItems(currentAudit.metrics).map((m) => (
													<div
														key={m.label}
														className="group bg-surface-inset border border-transparent hover:border-accent rounded-lg px-3 py-2 text-center transition-colors cursor-default"
													>
														<p className="text-[11px] text-muted">{m.label}</p>
														<p className="text-base font-semibold text-text">
															{m.value}
														</p>

														{/* Expande ao passar o mouse (grid 0fr -> 1fr) */}
														<div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-out">
															<div className="overflow-hidden">
																<div className="pt-2 text-left">
																	<p className="text-xs font-semibold text-text">
																		{m.title}
																	</p>
																	<p className="mt-1 text-xs leading-relaxed text-muted">
																		{m.desc}
																	</p>
																	<span
																		className={`mt-2 inline-block text-[11px] px-2 py-0.5 rounded ${toneClass[m.status]}`}
																	>
																		{toneLabel[m.status]} · {m.ideal}
																	</span>
																</div>
															</div>
														</div>
													</div>
												))}
											</div>
										</motion.div>
									)}
							</div>

							{isPolling && (
								<div className={`${CARD} p-4 md:p-6 mt-4`}>
									<AuditProgress />
									<div className="space-y-3">
										{[1, 2, 3, 4, 5].map((i) => (
											<div
												key={i}
												className="h-3 rounded bg-surface-inset animate-pulse"
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
											className={`${CARD} p-4 md:p-6 mt-4`}
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ duration: 0.4 }}
										>
											<h3 className="font-display font-semibold mb-4 text-highlight">
												<span className="flex items-center gap-2">
													<Bot size={20} /> Recomendações da IA
												</span>
											</h3>
											<div className="space-y-3">
												{currentAudit.recommendations.map((rec, i) => (
													<RecommendationCard
														key={rec.id ?? i}
														recommendation={rec}
														index={i}
													/>
												))}
											</div>
										</motion.div>
									)}
							</AnimatePresence>
						</motion.div>
					) : (
						<motion.div
							key="empty-state"
							className={`${CARD} p-8 md:p-12 text-center mb-6`}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.4, delay: 0.3 }}
						>
							<Radar
								size={32}
								className="mx-auto mb-3 text-muted opacity-60"
							/>
							<p className="text-muted text-base md:text-lg">
								Insira uma URL acima para iniciar a auditoria
							</p>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Histórico */}
				<AnimatePresence>
					{history && history.length > 0 && (
						<motion.div
							className={`${CARD} p-4 md:p-6`}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, delay: 0.4 }}
						>
							<h2 className="font-display text-lg font-semibold mb-4 text-text">
								Histórico de Auditorias
							</h2>
							<div className="space-y-3">
								{history.map((item, index) => (
									<motion.div
										key={item.id}
										onClick={() => selectAudit(item.id)}
										className={`flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer transition-colors ${item.id === selectedAuditId ? "bg-surface-inset border border-accent" : "bg-surface-inset hover:opacity-90"}`}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ duration: 0.3, delay: index * 0.05 }}
										whileHover={{ scale: 1.01 }}
										whileTap={{ scale: 0.99 }}
									>
										<div className="flex items-center gap-3 min-w-0 flex-1">
											{/* eslint-disable-next-line @next/next/no-img-element */}
											<img
												src={faviconFor(item.domain) ?? ""}
												alt=""
												width={20}
												height={20}
												loading="lazy"
												className="h-5 w-5 rounded shrink-0 bg-surface-inset object-contain"
												onError={(e) => {
													e.currentTarget.style.visibility = "hidden";
												}}
											/>
											<div className="min-w-0">
												<p className="text-sm text-text truncate">
													{item.domain}
												</p>
												<p className="text-xs text-muted">
													{formatDate(item.createdAt)}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<span
												className={`text-sm font-medium ${isPageSpeedUnavailable(item.scores) ? "text-muted" : item.scores?.overall !== undefined ? ScoreColor(item.scores.overall) : "text-muted"}`}
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

							{hasNextPage && (
								<button
									type="button"
									onClick={fetchNextPage}
									disabled={isFetchingNextPage}
									className="mt-4 w-full text-sm font-medium rounded-lg py-2.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-surface-inset hover:opacity-90 text-text"
								>
									{isFetchingNextPage ? "Carregando..." : "Carregar mais"}
								</button>
							)}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</main>
	);
}
