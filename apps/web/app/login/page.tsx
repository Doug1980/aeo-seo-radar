"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { MdEmail } from "react-icons/md";
import { Toaster, toast } from "sonner";

export default function LoginPage() {
	const [showEmailForm, setShowEmailForm] = useState(false);

	return (
		<main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 text-white flex items-center justify-center px-4 py-12">
			<Toaster position="top-center" theme="dark" richColors />
			<div className="w-full max-w-md mb-6">
				{/* Logo / Header fora do card */}
				<div className="flex flex-col items-center mb-8">
					{/* Logo */}
					<div className="flex flex-col items-center mb-8">
						<svg
							width="400"
							height="300"
							viewBox="245 30 200 260"
							role="img"
							xmlns="http://www.w3.org/2000/svg"
						>
							<title>AEO &amp; SEO Radar logo</title>
							<circle
								cx="340"
								cy="140"
								r="90"
								fill="none"
								stroke="#1e40af"
								strokeWidth="1.5"
								opacity="0.4"
							/>
							<circle
								cx="340"
								cy="140"
								r="65"
								fill="none"
								stroke="#1e40af"
								strokeWidth="1.5"
								opacity="0.5"
							/>
							<circle
								cx="340"
								cy="140"
								r="40"
								fill="none"
								stroke="#1e40af"
								strokeWidth="1.5"
								opacity="0.6"
							/>
							<circle cx="340" cy="140" r="16" fill="#1e40af" opacity="0.8" />
							<circle cx="340" cy="140" r="6" fill="#60a5fa" />
							<line
								x1="340"
								y1="140"
								x2="340"
								y2="50"
								stroke="#3b82f6"
								strokeWidth="1"
								opacity="0.5"
							/>
							<line
								x1="340"
								y1="140"
								x2="430"
								y2="140"
								stroke="#3b82f6"
								strokeWidth="1"
								opacity="0.5"
							/>
							<line
								x1="340"
								y1="140"
								x2="276"
								y2="76"
								stroke="#3b82f6"
								strokeWidth="1"
								opacity="0.3"
							/>
							<line
								x1="340"
								y1="140"
								x2="404"
								y2="76"
								stroke="#3b82f6"
								strokeWidth="1"
								opacity="0.3"
							/>
							<line
								x1="340"
								y1="140"
								x2="406"
								y2="73"
								stroke="#60a5fa"
								strokeWidth="2"
								strokeLinecap="round"
								opacity="0.9"
							/>
							<circle cx="390" cy="95" r="5" fill="#60a5fa" opacity="0.9" />
							<circle
								cx="390"
								cy="95"
								r="9"
								fill="none"
								stroke="#60a5fa"
								strokeWidth="1"
								opacity="0.4"
							/>
							<circle cx="358" cy="108" r="3.5" fill="#93c5fd" opacity="0.7" />
							<text
								x="340"
								y="262"
								textAnchor="middle"
								fontFamily="Arial, sans-serif"
								fontSize="28"
								fontWeight="700"
								fill="#f1f5f9"
								letterSpacing="1"
							>
								AEO &amp; SEO Radar
							</text>
							<text
								x="340"
								y="288"
								textAnchor="middle"
								fontFamily="Arial, sans-serif"
								fontSize="13"
								fill="#94a3b8"
								letterSpacing="2"
							>
								PRESENÇA DIGITAL
							</text>
						</svg>
					</div>
				</div>

				{/* Card */}
				<div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl">
					<p className="text-center text-gray-400 text-sm mb-6">
						Entre para acessar o dashboar{" "}
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
							className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 font-medium py-3 rounded-xl transition-colors cursor-pointer"
						>
							<FaGithub size={20} />
							Entrar com GitHub
						</button>
					</div>

					<div className="mt-6 pt-6 border-t border-gray-800">
						{!showEmailForm ? (
							<button
								type="button"
								onClick={() => setShowEmailForm(true)}
								className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white font-medium py-3 rounded-xl transition-colors cursor-pointer"
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
				<p className="text-center text-gray-600 text-xs mt-6">
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
				<div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600/20">
					<MdEmail size={28} className="text-blue-400" />
				</div>
				<div>
					<h3 className="text-white font-medium text-lg">Email enviado!</h3>
					<p className="text-gray-400 text-sm mt-1">
						Link de acesso enviado para{" "}
						<span className="text-gray-200">{email}</span>. Verifique sua caixa
						de entrada para continuar.
					</p>
				</div>
				<button
					type="button"
					onClick={onCancel}
					className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white font-medium py-3 rounded-xl transition-colors cursor-pointer"
				>
					Voltar
				</button>
			</div>
		);
	}

	// Tela do formulário — padrão
	return (
		<div className="space-y-3">
			<p className="text-gray-500 text-sm mb-3">
				Digite seu email para receber o link
			</p>
			<form onSubmit={handleSubmit} className="flex flex-col gap-2">
				<input
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="seu@email.com"
					required
					className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
				/>
				<button
					type="submit"
					disabled={loading}
					className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors cursor-pointer"
				>
					{loading ? "Enviando..." : "✨ Enviar link mágico"}
				</button>
			</form>
			<button
				type="button"
				onClick={onCancel}
				className="w-full text-gray-600 hover:text-gray-400 text-xs transition-colors cursor-pointer mt-1"
			>
				Voltar
			</button>
		</div>
	);
}
