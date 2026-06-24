import { sign } from "hono/jwt";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../services/auditService.js", () => ({
	startBackgroundAudit: vi.fn(),
}));

process.env.AUTH_API_SECRET = process.env.AUTH_API_SECRET ?? "test-secret";

import { app } from "../index.js";

const SECRET = process.env.AUTH_API_SECRET as string;
let authHeaders: Record<string, string>;

async function bearer(sub = "test-user"): Promise<Record<string, string>> {
	const token = await sign(
		{ sub, exp: Math.floor(Date.now() / 1000) + 300 },
		SECRET,
	);
	return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
	authHeaders = await bearer();
});

describe("Autenticacao", () => {
	it("retorna 401 sem token", async () => {
		const res = await app.request("/api/v1/audits");
		expect(res.status).toBe(401);
	});

	it("retorna 401 com token invalido", async () => {
		const res = await app.request("/api/v1/audits", {
			headers: { Authorization: "Bearer token-invalido" },
		});
		expect(res.status).toBe(401);
	});
});

describe("POST /api/v1/audits", () => {
	it("deve retornar 404 para id inexistente", async () => {
		const res = await app.request(
			"/api/v1/audits/00000000-0000-0000-0000-000000000000",
			{ headers: authHeaders },
		);
		const body = await res.json();

		expect(res.status).toBe(404);
		expect(body.error).toBeDefined();
		expect(body.code).toBe("NOT_FOUND");
	});

	it("deve retornar 400 com URL invalida", async () => {
		const res = await app.request("/api/v1/audits", {
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeaders },
			body: JSON.stringify({ domain: "nao-e-uma-url" }),
		});
		expect(res.status).toBe(400);
	});

	it("deve retornar 400 sem body", async () => {
		const res = await app.request("/api/v1/audits", {
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeaders },
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(400);
	});
});

describe("GET /api/v1/audits", () => {
	it("deve retornar lista de auditorias", async () => {
		const res = await app.request("/api/v1/audits", { headers: authHeaders });
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(Array.isArray(body.data)).toBe(true);
	});

	it("cada auditoria deve conter os campos obrigatorios", async () => {
		await app.request("/api/v1/audits", {
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeaders },
			body: JSON.stringify({ domain: "https://example.com" }),
		});

		const res = await app.request("/api/v1/audits", { headers: authHeaders });
		const body = await res.json();

		expect(body.data.length).toBeGreaterThan(0);

		const audit = body.data[0];
		expect(audit.id).toBeDefined();
		expect(audit.domain).toBeDefined();
		expect(audit.status).toBeDefined();
		expect(audit.createdAt).toBeDefined();
		expect(audit.scores).toBeDefined();
		expect(audit.recommendations).toBeDefined();
	});

	it("deve retornar no maximo 20 auditorias", async () => {
		const res = await app.request("/api/v1/audits", { headers: authHeaders });
		const body = await res.json();

		expect(body.data.length).toBeLessThanOrEqual(20);
	});
});

describe("GET /api/v1/audits/:id", () => {
	it("deve retornar auditoria existente com todos os campos", async () => {
		const created = await app.request("/api/v1/audits", {
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeaders },
			body: JSON.stringify({ domain: "https://example.com" }),
		});
		const createdBody = await created.json();
		const id = createdBody.data.id;

		const res = await app.request(`/api/v1/audits/${id}`, {
			headers: authHeaders,
		});
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.data.id).toBe(id);
		expect(body.data.domain).toBe("https://example.com");
		expect(body.data.recommendations).toBeDefined();
	});

	it("nao vaza auditoria de outro usuario (isolamento)", async () => {
		const created = await app.request("/api/v1/audits", {
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeaders },
			body: JSON.stringify({ domain: "https://example.com" }),
		});
		const id = (await created.json()).data.id;

		const otherUser = await bearer("outro-usuario");
		const res = await app.request(`/api/v1/audits/${id}`, {
			headers: otherUser,
		});
		expect(res.status).toBe(404);
	});

	it("deve retornar 404 para id em formato invalido", async () => {
		const res = await app.request("/api/v1/audits/id-que-nao-existe", {
			headers: authHeaders,
		});
		const body = await res.json();

		expect(res.status).toBe(404);
		expect(body.code).toBe("NOT_FOUND");
	});
});
