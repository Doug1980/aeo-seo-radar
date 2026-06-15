import { z } from "zod";

export type AuditStatus = "pending" | "running" | "completed" | "failed";

// ─── Recommendation (cards ricos) ───────────────────────────────

export const recommendationSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string(),
	category: z.enum(["seo", "aeo", "performance"]),
	severity: z.enum(["critical", "warning", "info"]),
	impact: z.enum(["high", "medium", "low"]),
	effort: z.enum(["high", "medium", "low"]),
	steps: z.array(z.string()).min(1),
});

// O LLM não gera id confiável — geramos no servidor. Validamos SEM id.
export const llmRecommendationSchema = recommendationSchema.omit({ id: true });
export const llmResponseSchema = z.object({
	recommendations: z.array(llmRecommendationSchema),
});

export type Recommendation = z.infer<typeof recommendationSchema>;
export type RecommendationCategory = Recommendation["category"];
export type RecommendationSeverity = Recommendation["severity"];

// ─── Audit ──────────────────────────────────────────────────────

export interface AuditScores {
	overall: number;
	seo: number;
	aeo: number;
	performance: number;
	schemaMarkup: number;
}

export interface DomainAudit {
	id: string;
	domain: string;
	status: AuditStatus;
	createdAt: string;
	completedAt?: string;
	scores: AuditScores;
	recommendations: Recommendation[]; // era string[]?
}

// ─── API envelope ───────────────────────────────────────────────

export interface ApiResponse<T> {
	data: T;
	message?: string;
}

export interface ApiError {
	error: string;
	code: string;
}
