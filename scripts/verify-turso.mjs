#!/usr/bin/env node
/** Quick check that Turso is configured and reachable. */
import { createClient } from "@libsql/client"
import { loadEnvFiles } from "./load-env.mjs"

loadEnvFiles()

const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN")
  process.exit(1)
}

const db = createClient({ url, authToken })
const tables = await db.execute(`
  SELECT name FROM sqlite_master
  WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`)

console.log(`Turso OK — ${tables.rows.length} tables`)
for (const row of tables.rows) {
  const count = await db.execute(`SELECT COUNT(*) AS n FROM ${row.name}`)
  console.log(`  ${row.name}: ${count.rows[0].n}`)
}
