// apps/api/src/middleware/rateLimit.ts
import type { Context, Next } from "hono";
import type { AuthEnv } from "./auth.js";

/**
 * Rate limiting simples em memória.
 *
 * Limita requisições por usuário (header x-user-id) numa janela de tempo.
 * Adequado para instância única / tráfego baixo. Em produção multi-instância,
 * a contagem precisaria de uma store compartilhada (ex: Redis), já que cada
 * instância teria seu próprio Map.
 *
 * A limpeza periódica evita que o Map cresça indefinidamente com entradas
 * de usuários que não fazem mais requisições.
 */

interface RateLimitEntry {
	count: number;
	resetAt: number; // timestamp (ms) em que a janela expira
}

interface RateLimitOptions {
	windowMs: number; // tamanho da janela em ms
	max: number; // máximo de requisições por janela
}

const store = new Map<string, RateLimitEntry>();

// Limpeza periódica das entradas expiradas (a cada 5 minutos)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of store.entries()) {
		if (now >= entry.resetAt) {
			store.delete(key);
		}
	}
}, CLEANUP_INTERVAL_MS).unref(); // unref: não impede o processo de encerrar

export function rateLimit(options: RateLimitOptions) {
	const { windowMs, max } = options;

	return async (c: Context<AuthEnv>, next: Next) => {
		// Identifica o usuário autenticado (setado por requireAuth).
		// Fallback defensivo para um bucket genérico, caso seja usado sem auth.
		const userId = c.get("userId") ?? "anonymous";
		const now = Date.now();

		const entry = store.get(userId);

		if (!entry || now >= entry.resetAt) {
			// Primeira requisição da janela (ou janela expirada): reinicia
			store.set(userId, { count: 1, resetAt: now + windowMs });
			return next();
		}

		if (entry.count >= max) {
			// Estourou o limite — responde 429 com Retry-After
			const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
			c.header("Retry-After", String(retryAfterSec));
			return c.json(
				{
					error: `Muitas requisições. Tente novamente em ${retryAfterSec}s.`,
					code: "RATE_LIMITED",
				},
				429,
			);
		}

		// Dentro do limite: incrementa e segue
		entry.count += 1;
		return next();
	};
}
