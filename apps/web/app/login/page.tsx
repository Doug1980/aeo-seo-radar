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
		<main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
			<Toaster position="top-center" theme="dark" richColors />
			<div className="bg-gray-900 border border-gray-800 rounded-xl p-10 w-full max-w-md text-center">
				<h1 className="text-2xl font-bold mb-2">AEO & SEO Radar 📡</h1>
				<p className="text-gray-400 mb-8">Entre para acessar o dashboard</p>

				<div className="space-y-3">
					<button
						type="button"
						onClick={() => signIn("google", { callbackUrl: "/" })}
						className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 hover:bg-gray-100 font-medium py-2.5 rounded-lg transition-colors cursor-pointer"
					>
						<FcGoogle size={20} />
						Entrar com Google
					</button>

					<button
						type="button"
						onClick={() => signIn("github", { callbackUrl: "/" })}
						className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 font-medium py-2.5 rounded-lg transition-colors cursor-pointer"
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
							className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white font-medium py-2.5 rounded-lg transition-colors cursor-pointer"
						>
							<MdEmail size={20} />
							Entrar com seu melhor e-mail
						</button>
					) : (
						<EmailForm onCancel={() => setShowEmailForm(false)} />
					)}
				</div>
			</div>
		</main>
	);
}

function EmailForm({ onCancel }: { onCancel: () => void }) {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);

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
				toast.success("Link mágico enviado! Verifique seu email.");
			}
		} catch {
			toast.error("Algo deu errado. Tente novamente.");
		} finally {
			setLoading(false);
		}
	}

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
					className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
				/>
				<button
					type="submit"
					disabled={loading}
					className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg font-medium transition-colors cursor-pointer"
				>
					{loading ? "Enviando..." : "✨ Enviar link mágico"}
				</button>
			</form>
			<button
				type="button"
				onClick={onCancel}
				className="text-gray-600 hover:text-gray-400 text-xs transition-colors cursor-pointer"
			>
				Voltar
			</button>
		</div>
	);
}
