import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

const client = postgres({
  host: 'localhost',
  port: 5433,
  database: 'aeo_seo_radar',
  username: 'radar',
})

export const db = drizzle(client, { schema })