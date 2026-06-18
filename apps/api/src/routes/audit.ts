// apps/api/src/routes/audit.ts
import type { ApiResponse, DomainAudit } from "@aeo-seo-radar/shared";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import { audits } from "../db/schema.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { startBackgroundAudit } from "../services/auditService.js";

export const auditRoutes = new Hono();

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
		recommendations: audit.recommendations ?? [],
	};
}

/**
 * Bloqueia URLs que apontam para hosts internos/privados (anti-SSRF).
 * Em produção, impede que o servidor seja induzido a fazer requisições
 * para localhost, IPs privados ou o endpoint de metadata de cloud
 * (169.254.169.254 — vetor clássico de roubo de credenciais).
 * Em desenvolvimento, permite tudo para facilitar testes locais.
 */
function isPublicUrl(value: string): boolean {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return false;
	}

	// Apenas http/https
	if (!["http:", "https:"].includes(url.protocol)) return false;

	// Em dev, libera localhost e IPs internos para testes
	if (process.env["NODE_ENV"] !== "production") return true;

	const host = url.hostname.toLowerCase();

	// localhost e variações
	if (
		host === "localhost" ||
		host === "0.0.0.0" ||
		host.endsWith(".localhost")
	) {
		return false;
	}

	// IPv4 privados/internos:
	// 10.x, 127.x (loopback), 169.254.x (link-local/metadata), 192.168.x,
	// 172.16-31.x
	const privateIpv4 =
		/^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;
	if (privateIpv4.test(host)) return false;

	// IPv6 loopback e link-local/unique-local
	if (
		host === "::1" ||
		host.startsWith("fe80") ||
		host.startsWith("fc") ||
		host.startsWith("fd")
	) {
		return false;
	}

	return true;
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

		const userId = c.req.header("x-user-id");
		if (!userId) {
			return c.json(
				{ error: "Autenticação necessária", code: "UNAUTHORIZED" },
				401,
			);
		}

		const [audit] = await db
			.insert(audits)
			.values({
				domain,
				userId,
				status: "pending",
				scores: { overall: 0, seo: 0, aeo: 0, performance: 0, schemaMarkup: 0 },
			})
			.returning();

		if (!audit) {
			return c.json({ error: "Erro ao criar auditoria no banco" }, 500);
		}

		await db
			.update(audits)
			.set({ status: "running" })
			.where(eq(audits.id, audit.id));

		startBackgroundAudit(audit.id, domain);

		const response: ApiResponse<DomainAudit> = {
			data: toAuditResponse(audit),
		};

		return c.json(response, 201);
	},
);

auditRoutes.get("/", async (c) => {
	const userId = c.req.header("x-user-id");
	if (!userId) {
		return c.json(
			{ error: "Autenticação necessária", code: "UNAUTHORIZED" },
			401,
		);
	}

	const allAudits = await db.query.audits.findMany({
		where: eq(audits.userId, userId),
		orderBy: [desc(audits.createdAt)],
		limit: 20,
	});

	const response: ApiResponse<DomainAudit[]> = {
		data: allAudits.map(toAuditResponse),
	};

	return c.json(response);
});

auditRoutes.get("/:id", async (c) => {
	const userId = c.req.header("x-user-id");
	if (!userId) {
		return c.json(
			{ error: "Autenticação necessária", code: "UNAUTHORIZED" },
			401,
		);
	}

	const id = c.req.param("id");

	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(id)) {
		return c.json(
			{ error: "Auditoria não encontrada", code: "NOT_FOUND" },
			404,
		);
	}

	const audit = await db.query.audits.findFirst({
		where: and(eq(audits.id, id), eq(audits.userId, userId)),
	});

	if (!audit) {
		return c.json(
			{ error: "Auditoria não encontrada", code: "NOT_FOUND" },
			404,
		);
	}

	const response: ApiResponse<DomainAudit> = {
		data: toAuditResponse(audit),
	};

	return c.json(response);
});
