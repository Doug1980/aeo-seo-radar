// apps/web/app/lib/api.ts
const API_BASE =
	process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3001";

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
