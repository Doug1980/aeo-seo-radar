"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
	return (
		<main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
			<div className="bg-gray-900 border border-gray-800 rounded-xl p-10 w-full max-w-md text-center">
				<h1 className="text-2xl font-bold mb-2">AEO & SEO Radar 📡</h1>
				<p className="text-gray-400 mb-8">Entre para acessar o dashboard</p>

				<div className="space-y-3">
					<button
						type="button"
						onClick={() => signIn("google", { callbackUrl: "/" })}
						className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 hover:bg-gray-100 font-medium py-2.5 rounded-lg transition-colors"
					>
						Entrar com Google
					</button>

					<button
						type="button"
						onClick={() => signIn("github", { callbackUrl: "/" })}
						className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 font-medium py-2.5 rounded-lg transition-colors"
					>
						Entrar com GitHub
					</button>
				</div>

				<div className="mt-6 pt-6 border-t border-gray-800">
					<p className="text-gray-500 text-sm mb-3">Ou entre com email</p>
					<EmailForm />
				</div>
			</div>
		</main>
	);
}

function EmailForm() {
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		await signIn("resend", { email, callbackUrl: "/", redirect: false });
		setSent(true);
	}

	if (sent) {
		return (
			<p className="text-green-400 text-sm">
				✅ Link enviado! Verifique seu email.
			</p>
		);
	}

	return (
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
				className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
			>
				Enviar magic link
			</button>
		</form>
	);
}
