import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Emite um JWT curto (15 min) a partir da sessão autenticada.
 *
 * O front pede este token e o envia no `Authorization: Bearer` para a API
 * (Railway). Como o segredo `AUTH_API_SECRET` nunca chega ao browser e o
 * token é assinado server-side a partir da sessão real, a API passa a ter
 * uma identidade confiável do usuário — em vez do antigo `x-user-id`
 * falsificável.
 */
export async function GET() {
	const session = await auth();
	// Identidade = e-mail, para manter compatibilidade com os dados já em
	// produção (audits.userId historicamente é o e-mail do usuário).
	const email = session?.user?.email;

	if (!email) {
		return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
	}

	const secret = process.env.AUTH_API_SECRET;
	if (!secret) {
		console.error("[token] AUTH_API_SECRET não configurado");
		return NextResponse.json(
			{ error: "Configuração de autenticação ausente" },
			{ status: 500 },
		);
	}

	const token = await new SignJWT({})
		.setProtectedHeader({ alg: "HS256" })
		.setSubject(email)
		.setIssuedAt()
		.setExpirationTime("15m")
		.sign(new TextEncoder().encode(secret));

	return NextResponse.json({ token });
}
