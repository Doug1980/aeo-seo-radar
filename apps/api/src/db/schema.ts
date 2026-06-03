import { pgTable, uuid, varchar, integer, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core'

export const auditStatusEnum = pgEnum('audit_status', [
  'pending',
  'running',
  'completed',
  'failed',
])

export const audits = pgTable('audits', {
  id: uuid('id').primaryKey().defaultRandom(),
  domain: varchar('domain', { length: 255 }).notNull(),
  status: auditStatusEnum('status').notNull().default('pending'),
  scores: jsonb('scores').$type<{
    overall: number
    seo: number
    aeo: number
    performance: number
    schemaMarkup: number
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
})