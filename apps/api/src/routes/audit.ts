import type { ApiResponse, DomainAudit } from "@aeo-seo-radar/shared";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import { audits } from "../db/schema.js";
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

const createAuditSchema = z.object({
	domain: z.string().url({ message: "Informe uma URL válida" }),
});

// ─── POST / — Cria uma nova auditoria ────────────────────────────────────────
auditRoutes.post("/", zValidator("json", createAuditSchema), async (c) => {
	const { domain } = c.req.valid("json");
	const userId = c.req.header("x-user-id") ?? null;

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
});

// ─── GET / — Lista auditorias do usuário ─────────────────────────────────────
auditRoutes.get("/", async (c) => {
	const userId = c.req.header("x-user-id") ?? null;

	const allAudits = userId
		? await db.query.audits.findMany({
				where: eq(audits.userId, userId),
				orderBy: (audits, { desc }) => [desc(audits.createdAt)],
				limit: 20,
			})
		: await db.query.audits.findMany({
				orderBy: (audits, { desc }) => [desc(audits.createdAt)],
				limit: 20,
			});

	const response: ApiResponse<DomainAudit[]> = {
		data: allAudits.map(toAuditResponse),
	};

	return c.json(response);
});

// ─── GET /:id — Retorna uma auditoria completa ───────────────────────────────
auditRoutes.get("/:id", async (c) => {
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
		where: eq(audits.id, id),
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
