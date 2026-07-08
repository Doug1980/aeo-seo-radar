// apps/api/src/routes/audit.ts
import { lookup } from "node:dns/promises";
import type { ApiResponse, DomainAudit } from "@aeo-seo-radar/shared";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
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

/**
 * Cota diária de auditorias por usuário. Cada auditoria dispara chamadas
 * externas pagas (Google PageSpeed + Groq), então limitamos o volume por dia
 * para conter custo. Configurável via env, sem precisar de redeploy de código.
 */
function dailyAuditLimit(): number {
	return Number(process.env["DAILY_AUDIT_LIMIT"]) || 5;
}

/** Início do dia atual em UTC — referência para a janela diária. */
function startOfUtcDay(): Date {
	const d = new Date();
	d.setUTCHours(0, 0, 0, 0);
	return d;
}

/**
 * Conta quantas auditorias o usuário criou desde a meia-noite (UTC).
 * A cota deriva da própria tabela `audits` — nada de contador paralelo: é
 * fonte única de verdade, sobrevive a restart e funciona multi-instância.
 */
async function countAuditsToday(userId: string): Promise<number> {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(audits)
		.where(
			and(eq(audits.userId, userId), gte(audits.createdAt, startOfUtcDay())),
		);
	return row?.count ?? 0;
}

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
	// Zod 4: formatos de string promovidos a top-level (z.url) e erro unificado
	// via `error` (o antigo `message` foi deprecado).
	domain: z.url({ error: "Informe uma URL válida" }).refine(isPublicUrl, {
		error: "Domínios internos ou privados não são permitidos",
	}),
});

auditRoutes.post(
	"/",
	rateLimit({ windowMs: 60_000, max: 5 }),
	zValidator("json", createAuditSchema),
	async (c) => {
		const { domain } = c.req.valid("json");
		const userId = c.get("userId");

		// Cota diária: barra antes de qualquer trabalho caro (DNS + APIs externas).
		const limit = dailyAuditLimit();
		const usedToday = await countAuditsToday(userId);
		if (usedToday >= limit) {
			return c.json(
				{
					error: "Limite diário de auditorias atingido.",
					code: "DAILY_LIMIT_EXCEEDED",
					limit,
					remaining: 0,
				},
				429,
			);
		}

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

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

auditRoutes.get("/", async (c) => {
	const userId = c.get("userId");

	// Paginação por offset. Busca limit+1 para saber se há próxima página
	// sem precisar de um COUNT separado.
	const limit = Math.min(
		Math.max(Number(c.req.query("limit")) || DEFAULT_LIMIT, 1),
		MAX_LIMIT,
	);
	const offset = Math.max(Number(c.req.query("offset")) || 0, 0);

	const rows = await db.query.audits.findMany({
		where: eq(audits.userId, userId),
		orderBy: [desc(audits.createdAt)],
		limit: limit + 1,
		offset,
	});

	const hasMore = rows.length > limit;
	const pageRows = hasMore ? rows.slice(0, limit) : rows;

	// Marca como "failed" os audits "running" antigos (presos por um restart)
	const staleIds = pageRows.filter(isStaleRunning).map((a) => a.id);
	if (staleIds.length > 0) {
		await db
			.update(audits)
			.set({ status: "failed" })
			.where(inArray(audits.id, staleIds));
	}

	const staleSet = new Set(staleIds);
	const response: ApiResponse<DomainAudit[]> = {
		data: pageRows.map((a) =>
			staleSet.has(a.id)
				? toAuditResponse({ ...a, status: "failed" })
				: toAuditResponse(a),
		),
		hasMore,
	};

	return c.json(response);
});

/**
 * Cota diária do usuário. Definida ANTES de "/:id" para não ser capturada
 * pela rota paramétrica (senão "quota" seria tratado como um id).
 */
auditRoutes.get("/quota", async (c) => {
	const userId = c.get("userId");
	const limit = dailyAuditLimit();
	const used = await countAuditsToday(userId);
	const remaining = Math.max(limit - used, 0);
	return c.json({ data: { limit, used, remaining } });
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
