import "dotenv/config";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auditRoutes } from "./routes/audit.js";
import { healthRoutes } from "./routes/health.js";

export const app = new Hono();

app.use("*", logger());
app.use(
	"*",
	cors({
		origin: process.env["FRONTEND_URL"] ?? "http://localhost:3000",
	}),
);

app.route("/health", healthRoutes);
app.route("/api/v1/audits", auditRoutes);

app.notFound((c) =>
	c.json({ error: "Route not found", code: "NOT_FOUND" }, 404),
);

app.onError((err, c) => {
	console.error("[Error]", err);
	return c.json(
		{ error: "Internal server error", code: "INTERNAL_ERROR" },
		500,
	);
});

// Só sobe o servidor se não estiver em ambiente de teste
if (process.env["NODE_ENV"] !== "test") {
	const port = Number(process.env["PORT"] ?? 3001);
	serve({ fetch: app.fetch, port }, () => {
		console.log(`API rodando na porta ${port}`);
	});
}
