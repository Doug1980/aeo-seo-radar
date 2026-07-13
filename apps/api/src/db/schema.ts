import type {
	AuditFindings,
	AuditMetrics,
	Recommendation,
} from "@aeo-seo-radar/shared";
import {
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const auditStatusEnum = pgEnum("audit_status", [
	"pending",
	"running",
	"completed",
	"failed",
]);

export interface AuditScores {
	seo: number;
	aeo: number;
	performance: number;
	schemaMarkup: number;
	overall: number;
	accessibility?: number;
	bestPractices?: number;
}

export const audits = pgTable("audits", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id").notNull(),
	domain: text("domain").notNull(),
	status: auditStatusEnum("status").notNull().default("pending"),
	scores: jsonb("scores").$type<AuditScores>(),
	metrics: jsonb("metrics").$type<AuditMetrics>(),
	findings: jsonb("findings").$type<AuditFindings>(),
	recommendations: jsonb("recommendations")
		.$type<Recommendation[]>()
		.notNull()
		.default([]),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	completedAt: timestamp("completed_at"),
});

export type Audit = typeof audits.$inferSelect;
