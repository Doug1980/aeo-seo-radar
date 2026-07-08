// apps/web/app/lib/api.ts
const API_BASE =
	process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3001";

/**
 * Erro de API que preserva o status HTTP e o `code` de negócio devolvido pelo
 * back-end (ex.: "DAILY_LIMIT_EXCEEDED"), para a UI reagir de forma específica.
 */
export class ApiError extends Error {
	status: number;
	code?: string;

	constructor(message: string, status: number, code?: string) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
	}
}

/** Lê o corpo JSON de uma resposta de erro e monta um ApiError tipado. */
export async function toApiError(
	res: Response,
	fallback: string,
): Promise<ApiError> {
	let message = fallback;
	let code: string | undefined;
	try {
		const body = (await res.json()) as { error?: string; code?: string };
		if (body.error) message = body.error;
		code = body.code;
	} catch {
		// corpo vazio ou não-JSON: mantém a mensagem de fallback
	}
	return new ApiError(message, res.status, code);
}

interface CachedToken {
	token: string;
	expiresAt: number;
}

// Cache em memória do JWT, renovado com folga antes de expirar (token vive 15min).
let cached: CachedToken | null = null;

async function fetchToken(): Promise<string | null> {
	const res = await fetch("/api/token", { cache: "no-store" });
	if (!res.ok) {
		cached = null;
		return null;
	}
	const { token } = (await res.json()) as { token: string };
	cached = { token, expiresAt: Date.now() + 13 * 60_000 };
	return token;
}

async function getToken(): Promise<string | null> {
	if (cached && cached.expiresAt > Date.now()) return cached.token;
	return fetchToken();
}

/**
 * fetch para a API com Bearer token. Se a API responder 401 (token expirado
 * ou revogado), descarta o cache, renova uma vez e repete a requisição.
 */
export async function apiFetch(
	path: string,
	init: RequestInit = {},
): Promise<Response> {
	const token = await getToken();
	const headers = new Headers(init.headers);
	if (token) headers.set("Authorization", `Bearer ${token}`);

	let res = await fetch(`${API_BASE}${path}`, { ...init, headers });

	if (res.status === 401) {
		cached = null;
		const fresh = await fetchToken();
		if (fresh) {
			headers.set("Authorization", `Bearer ${fresh}`);
			res = await fetch(`${API_BASE}${path}`, { ...init, headers });
		}
	}

	return res;
}
