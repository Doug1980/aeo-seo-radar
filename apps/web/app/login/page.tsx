"use client";

import { Sparkles } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { MdEmail } from "react-icons/md";
import { Toaster, toast } from "sonner";

export default function LoginPage() {
	const [showEmailForm, setShowEmailForm] = useState(false);

	return (
		<main className="relative min-h-screen overflow-hidden bg-slate-950 text-white flex items-center justify-center px-4 py-12">
			<Toaster position="top-center" theme="dark" richColors />

			{/* Fundo — gradiente + radar ambiente animado */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950"
			/>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-70"
			>
				<div className="relative h-[560px] w-[560px] sm:h-[720px] sm:w-[720px]">
					<div className="absolute inset-0 rounded-full border border-indigo-500/10" />
					<div className="absolute inset-[12%] rounded-full border border-indigo-500/10" />
					<div className="absolute inset-[24%] rounded-full border border-indigo-500/15" />
					<div className="absolute inset-[36%] rounded-full border border-indigo-500/20" />
					<div className="absolute inset-[48%] rounded-full border border-indigo-400/25" />
					<div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-indigo-500/10" />
					<div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-indigo-500/10" />
					<div
						className="radar-sweep absolute inset-0 rounded-full"
						style={{
							background:
								"conic-gradient(from 0deg, rgba(99,102,241,0.30), rgba(99,102,241,0.05) 20%, transparent 40%)",
						}}
					/>
				</div>
			</div>

			{/* Blur radial no topo pra dar profundidade */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl"
			/>

			<style>{`
				@keyframes radar-sweep-rot { to { transform: rotate(360deg); } }
				.radar-sweep { animation: radar-sweep-rot 6s linear infinite; transform-origin: center; }
				@media (prefers-reduced-motion: reduce) { .radar-sweep { animation: none; } }
			`}</style>

			<div className="relative z-10 w-full max-w-md">
				{/* Logo + headline */}
				<div className="flex flex-col items-center text-center mb-8">
					<svg
						width="220"
						height="150"
						viewBox="250 40 180 200"
						role="img"
						xmlns="http://www.w3.org/2000/svg"
						className="drop-shadow-[0_0_25px_rgba(99,102,241,0.40)]"
					>
						<title>AEO &amp; SEO Radar logo</title>
						<circle
							cx="340"
							cy="140"
							r="90"
							fill="none"
							stroke="#4338ca"
							strokeWidth="1.5"
							opacity="0.4"
						/>
						<circle
							cx="340"
							cy="140"
							r="65"
							fill="none"
							stroke="#4338ca"
							strokeWidth="1.5"
							opacity="0.5"
						/>
						<circle
							cx="340"
							cy="140"
							r="40"
							fill="none"
							stroke="#4338ca"
							strokeWidth="1.5"
							opacity="0.6"
						/>
						<circle cx="340" cy="140" r="16" fill="#4338ca" opacity="0.8" />
						<circle cx="340" cy="140" r="6" fill="#818cf8" />
						<line
							x1="340"
							y1="140"
							x2="340"
							y2="50"
							stroke="#6366f1"
							strokeWidth="1"
							opacity="0.5"
						/>
						<line
							x1="340"
							y1="140"
							x2="430"
							y2="140"
							stroke="#6366f1"
							strokeWidth="1"
							opacity="0.5"
						/>
						<line
							x1="340"
							y1="140"
							x2="276"
							y2="76"
							stroke="#6366f1"
							strokeWidth="1"
							opacity="0.3"
						/>
						<line
							x1="340"
							y1="140"
							x2="404"
							y2="76"
							stroke="#6366f1"
							strokeWidth="1"
							opacity="0.3"
						/>
						<line
							x1="340"
							y1="140"
							x2="406"
							y2="73"
							stroke="#818cf8"
							strokeWidth="2"
							strokeLinecap="round"
							opacity="0.9"
						/>
						<circle cx="390" cy="95" r="5" fill="#818cf8" opacity="0.9" />
						<circle
							cx="390"
							cy="95"
							r="9"
							fill="none"
							stroke="#818cf8"
							strokeWidth="1"
							opacity="0.4"
						/>
						<circle cx="358" cy="108" r="3.5" fill="#a5b4fc" opacity="0.7" />
					</svg>

					<h1
						className="font-display font-extrabold tracking-tight leading-[0.95]"
						style={{ fontSize: "clamp(2.25rem, 6vw, 3.25rem)" }}
					>
						Sua presença digital,{" "}
						<span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
							sob o radar.
						</span>
					</h1>
					<p className="mt-6 max-w-md text-slate-400 text-sm md:text-base leading-relaxed">
						Como o Google e as IAs enxergam seu site?{" "}
						<span className="sm:whitespace-nowrap">
							Descubra com nossa auditoria inteligente de SEO e AEO.
						</span>
					</p>
				</div>

				{/* Card */}
				<div className="bg-slate-900/70 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-black/40">
					<p className="text-center text-slate-400 text-sm mb-6">
						Entre para acessar o seu dashboard
					</p>

					<div className="space-y-3">
						<button
							type="button"
							onClick={() => signIn("google", { callbackUrl: "/" })}
							className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 hover:bg-gray-100 font-medium py-3 rounded-xl transition-colors cursor-pointer"
						>
							<FcGoogle size={20} />
							Entrar com Google
						</button>

						<button
							type="button"
							onClick={() => signIn("github", { callbackUrl: "/" })}
							className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 font-medium py-3 rounded-xl transition-colors cursor-pointer"
						>
							<FaGithub size={20} />
							Entrar com GitHub
						</button>
					</div>

					<div className="mt-6 pt-6 border-t border-slate-800">
						{!showEmailForm ? (
							<button
								type="button"
								onClick={() => setShowEmailForm(true)}
								className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-medium py-3 rounded-xl transition-colors cursor-pointer"
							>
								<MdEmail size={20} />
								Entrar com seu melhor e-mail
							</button>
						) : (
							<EmailForm onCancel={() => setShowEmailForm(false)} />
						)}
					</div>
				</div>

				{/* Footer */}
				<p className="text-center text-slate-500 text-xs mt-6">
					Ao entrar, você concorda com nossos termos de uso.
				</p>
			</div>
		</main>
	);
}

function EmailForm({ onCancel }: { onCancel: () => void }) {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);

		try {
			const result = await signIn("nodemailer", {
				email,
				callbackUrl: "/",
				redirect: false,
			});

			if (result?.error) {
				toast.error("Erro ao enviar o link. Tente novamente.");
			} else {
				// Em vez de só mostrar o toast, troca para a tela de confirmação
				setSent(true);
			}
		} catch {
			toast.error("Algo deu errado. Tente novamente.");
		} finally {
			setLoading(false);
		}
	}

	// Tela de confirmação — aparece depois que o link é enviado
	if (sent) {
		return (
			<div className="flex flex-col items-center text-center space-y-4 py-2">
				<div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600/20">
					<MdEmail size={28} className="text-indigo-400" />
				</div>
				<div>
					<h3 className="text-white font-medium text-lg">Email enviado!</h3>
					<p className="text-slate-400 text-sm mt-1">
						Link de acesso enviado para{" "}
						<span className="text-slate-200">{email}</span>. Verifique sua caixa
						de entrada para continuar.
					</p>
				</div>
				<button
					type="button"
					onClick={onCancel}
					className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-medium py-3 rounded-xl transition-colors cursor-pointer"
				>
					Voltar
				</button>
			</div>
		);
	}

	// Tela do formulário — padrão
	return (
		<div className="space-y-3">
			<p className="text-slate-400 text-sm mb-3">
				Digite seu email para receber o link
			</p>
			<form onSubmit={handleSubmit} className="flex flex-col gap-2">
				<input
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="seu@email.com"
					required
					className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
				/>
				<button
					type="submit"
					disabled={loading}
					className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors cursor-pointer"
				>
					{loading ? (
						"Enviando..."
					) : (
						<span className="flex items-center justify-center gap-2">
							<Sparkles size={18} /> Enviar link mágico
						</span>
					)}
				</button>
			</form>
			<button
				type="button"
				onClick={onCancel}
				className="w-full text-slate-500 hover:text-slate-400 text-xs transition-colors cursor-pointer mt-1"
			>
				Voltar
			</button>
		</div>
	);
}
