"use client";

import { useEffect, useState } from "react";

const messages = [
	"🔍 Analisando estrutura da página...",
	"⚡ Medindo performance (PageSpeed)...",
	"🤖 Verificando otimização para IA (AEO)...",
	"📊 Avaliando schema markup...",
	"📝 Gerando recomendações...",
];

export default function AuditProgress() {
	const [index, setIndex] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setIndex((prev) => (prev + 1) % messages.length);
		}, 3000);

		// Cleanup: evita vazamento de memória e múltiplos intervals
		// se o componente desmontar antes do polling terminar.
		return () => clearInterval(interval);
	}, []);

	return (
		<p className="text-sm font-medium dark:text-gray-300 text-gray-700 mb-4 transition-opacity">
			{messages[index]}
		</p>
	);
}
