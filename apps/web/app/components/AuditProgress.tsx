"use client";
import { BarChart3, Bot, FileText, Search, Zap } from "lucide-react";
import { useEffect, useState } from "react";

const messages = [
	{ icon: Search, text: "Analisando estrutura da página..." },
	{ icon: Zap, text: "Medindo performance (PageSpeed)..." },
	{ icon: Bot, text: "Verificando otimização para IA (AEO)..." },
	{ icon: BarChart3, text: "Avaliando schema markup..." },
	{ icon: FileText, text: "Gerando recomendações..." },
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

	const current = messages[index];
	const Icon = current.icon;

	return (
		<p className="text-sm font-medium dark:text-gray-300 text-gray-700 mb-4 flex items-center gap-2 transition-opacity">
			<Icon size={16} className="text-blue-500 animate-pulse" />
			{current.text}
		</p>
	);
}
