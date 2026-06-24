// apps/api/src/middleware/auth.ts
import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";

/**
 * Tipagem do contexto após a autenticação: `userId` fica disponível
 * via `c.get("userId")` em qualquer handler protegido por este middleware.
 */
export type AuthEnv = {
	Variables: {
		userId: string;
	};
};

/**
 * Exige um JWT válido (HS256) no header `Authorization: Bearer <token>`.
 *
 * O token é assinado pelo front (Next.js) a partir da sessão autenticada,
 * usando o segredo compartilhado `AUTH_API_SECRET`. Isso substitui a antiga
 * confiança cega no header `x-user-id` — que era falsificável, pois qualquer
 * cliente podia enviar o e-mail de outro usuário e acessar dados alheios.
 *
 * O `sub` do token é o id estável do usuário; ele é exposto via `c.get("userId")`.
 */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
	const secret = process.env["AUTH_API_SECRET"];
	if (!secret) {
		console.error("[auth] AUTH_API_SECRET não configurado");
		return c.json(
			{ error: "Configuração de autenticação ausente", code: "CONFIG_ERROR" },
			500,
		);
	}

	const header = c.req.header("authorization") ?? "";
	const token = header.toLowerCase().startsWith("bearer ")
		? header.slice(7).trim()
		: "";

	if (!token) {
		return c.json(
			{ error: "Autenticação necessária", code: "UNAUTHORIZED" },
			401,
		);
	}

	try {
		// `verify` valida assinatura e expiração (exp) automaticamente
		const payload = await verify(token, secret, "HS256");
		const userId = typeof payload.sub === "string" ? payload.sub : null;
		if (!userId) {
			return c.json({ error: "Token inválido", code: "UNAUTHORIZED" }, 401);
		}
		c.set("userId", userId);
		return next();
	} catch {
		return c.json(
			{ error: "Token inválido ou expirado", code: "UNAUTHORIZED" },
			401,
		);
	}
});
