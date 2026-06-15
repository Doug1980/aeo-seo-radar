import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "AEO & SEO Radar",
	description: "Monitoramento e auditoria de presença digital",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="pt-BR" suppressHydrationWarning>
			<body className={geist.className}>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
