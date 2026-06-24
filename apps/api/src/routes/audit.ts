// apps/api/src/routes/audit.ts
import { lookup } from "node:dns/promises";
import type { ApiResponse, DomainAudit } from "@aeo-seo-radar/shared";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import { audits } from "../db/schema.js";
import { type AuthEnv, requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { startBackgroundAudit } from "../services/auditService.js";

export const auditRoutes = new Hono<AuthEnv>();

// Toda rota de auditoria exige um JWT válido (sub = id do usuário).
auditRoutes.use("*", requireAuth);

/**
 * Tempo máximo que uma auditoria pode ficar em "running". Se um deploy
 * reiniciar no meio do job em background, o registro ficaria preso para
 * sempre — e o front faria polling infinito. Ao ler um audit "running"
 * mais velho que isso, marcamos como "failed" (lazy stale check), sem
 * precisar de um worker/cron dedicado.
 */
const STALE_AUDIT_MS = 3 * 60_000;

function toAuditResponse(audit: typeof audits.$inferSelect): DomainAudit {
	return {
		id: audit.id,
		domain: audit.domain,
		status: audit.status,
		createdAt: audit.createdAt.toISOString(),
		completedAt: audit.completedAt?.toISOString(),
		scores: audit.scores ?? {
			overall: 0,
			seo: 0,
			aeo: 0,
			performance: 0,
			schemaMarkup: 0,
		},
		metrics: audit.metrics ?? undefined,
		recommendations: audit.recommendations ?? [],
	};
}

function isStaleRunning(audit: typeof audits.$inferSelect): boolean {
	return (
		audit.status === "running" &&
		Date.now() - audit.createdAt.getTime() > STALE_AUDIT_MS
	);
}

/**
 * Verifica se um host textual aponta para um destino interno/privado.
 * Cobre localhost, IPv4 privados/loopback/link-local (inclui o endpoint
 * de metadata de cloud 169.254.169.254) e IPv6 loopback/link/unique-local.
 */
function isPrivateAddress(host: string): boolean {
	const h = host.toLowerCase();

	if (h === "localhost" || h.endsWith(".localhost") || h === "0.0.0.0") {
		return true;
	}

	const privateIpv4 =
		/^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;
	if (privateIpv4.test(h)) return true;

	if (
		h === "::1" ||
		h.startsWith("fe80") ||
		h.startsWith("fc") ||
		h.startsWith("fd")
	) {
		return true;
	}

	return false;
}

/**
 * Validação síncrona usada no schema Zod: protocolo http/https e host que
 * não seja literalmente interno. Em dev libera tudo para facilitar testes.
 */
function isPublicUrl(value: string): boolean {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return false;
	}

	if (!["http:", "https:"].includes(url.protocol)) return false;
	if (process.env["NODE_ENV"] !== "production") return true;

	return !isPrivateAddress(url.hostname);
}

/**
 * Checagem assíncrona anti-SSRF: resolve o hostname e garante que NENHUM
 * dos IPs resolvidos é privado. Fecha a brecha de DNS rebinding, em que um
 * domínio público resolve para um IP interno (ex.: 127.0.0.1). Em dev, libera.
 */
async function resolvesToPublicIp(hostname: string): Promise<boolean> {
	if (process.env["NODE_ENV"] !== "production") return true;
	try {
		const addresses = await lookup(hostname, { all: true });
		return (
			addresses.length > 0 &&
			addresses.every((a) => !isPrivateAddress(a.address))
		);
	} catch {
		// Falha de resolução → trata como não-público por segurança
		return false;
	}
}

const createAuditSchema = z.object({
	domain: z
		.string()
		.url({ message: "Informe uma URL válida" })
		.refine(isPublicUrl, {
			message: "Domínios internos ou privados não são permitidos",
		}),
});

auditRoutes.post(
	"/",
	rateLimit({ windowMs: 60_000, max: 5 }),
	zValidator("json", createAuditSchema),
	async (c) => {
		const { domain } = c.req.valid("json");
		const userId = c.get("userId");

		// Checagem anti-SSRF baseada em DNS (resolve o host antes de buscar)
		const { hostname } = new URL(domain);
		if (!(await resolvesToPublicIp(hostname))) {
			return c.json(
				{
					error: "Domínios internos ou privados não são permitidos",
					code: "FORBIDDEN",
				},
				400,
			);
		}

		const [audit] = await db
			.insert(audits)
			.values({
				domain,
				userId,
				status: "running",
				scores: { overall: 0, seo: 0, aeo: 0, performance: 0, schemaMarkup: 0 },
			})
			.returning();

		if (!audit) {
			return c.json({ error: "Erro ao criar auditoria no banco" }, 500);
		}

		startBackgroundAudit(audit.id, domain);

		const response: ApiResponse<DomainAudit> = {
			data: toAuditResponse(audit),
		};

		return c.json(response, 201);
	},
);

auditRoutes.get("/", async (c) => {
	const userId = c.get("userId");

	const allAudits = await db.query.audits.findMany({
		where: eq(audits.userId, userId),
		orderBy: [desc(audits.createdAt)],
		limit: 20,
	});

	// Marca como "failed" os audits "running" antigos (presos por um restart)
	const staleIds = allAudits.filter(isStaleRunning).map((a) => a.id);
	if (staleIds.length > 0) {
		await db
			.update(audits)
			.set({ status: "failed" })
			.where(inArray(audits.id, staleIds));
	}

	const staleSet = new Set(staleIds);
	const response: ApiResponse<DomainAudit[]> = {
		data: allAudits.map((a) =>
			staleSet.has(a.id)
				? toAuditResponse({ ...a, status: "failed" })
				: toAuditResponse(a),
		),
	};

	return c.json(response);
});

auditRoutes.get("/:id", async (c) => {
	const userId = c.get("userId");
	const id = c.req.param("id");

	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(id)) {
		return c.json(
			{ error: "Auditoria não encontrada", code: "NOT_FOUND" },
			404,
		);
	}

	let audit = await db.query.audits.findFirst({
		where: and(eq(audits.id, id), eq(audits.userId, userId)),
	});

	if (!audit) {
		return c.json(
			{ error: "Auditoria não encontrada", code: "NOT_FOUND" },
			404,
		);
	}

	// Lazy stale check: auditoria presa em "running" vira "failed"
	if (isStaleRunning(audit)) {
		await db
			.update(audits)
			.set({ status: "failed" })
			.where(eq(audits.id, audit.id));
		audit = { ...audit, status: "failed" };
	}

	const response: ApiResponse<DomainAudit> = {
		data: toAuditResponse(audit),
	};

	return c.json(response);
});
