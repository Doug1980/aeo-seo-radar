import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
	subsets: ["latin"],
	variable: "--font-space-grotesk",
});

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
			<body
				className={`${inter.variable} ${spaceGrotesk.variable} ${inter.className}`}
			>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
