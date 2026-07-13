ALTER TABLE "audits" ALTER COLUMN "domain" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "audits" ALTER COLUMN "recommendations" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "audits" ALTER COLUMN "recommendations" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "findings" jsonb;