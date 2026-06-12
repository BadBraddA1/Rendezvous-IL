#!/usr/bin/env node
/**
 * One-time migration: copy all public tables from Neon (Postgres) to Turso (SQLite).
 *
 * Usage:
 *   node scripts/migrate-neon-to-turso.mjs
 *   node scripts/migrate-neon-to-turso.mjs --turso-url=libsql://... --turso-token=...
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/migrate-neon-to-turso.mjs
 */

import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"
import readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { fileURLToPath } from "node:url"
import { neon } from "@neondatabase/serverless"
import { createClient } from "@libsql/client"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, "..")

function loadEnvFiles() {
  for (const name of [".env.local", ".env", ".env.turso.local"]) {
    const filePath = path.join(projectRoot, name)
    if (!fs.existsSync(filePath)) continue
    for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (missing(key, process.env[key])) process.env[key] = value
    }
  }
}

function missing(_name, value) {
  return !value || String(value).trim() === "" || value === '""' || value === "''"
}

function parseCliArgs() {
  const out = {}
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--turso-url=")) out.url = arg.slice("--turso-url=".length)
    if (arg.startsWith("--turso-token=")) out.token = arg.slice("--turso-token=".length)
    if (arg.startsWith("--turso-db=")) out.dbName = arg.slice("--turso-db=".length)
  }
  return out
}

function tryTursoCli(dbName) {
  try {
    execSync("turso auth whoami", { stdio: "pipe" })
  } catch {
    return null
  }

  let name = dbName
  if (!name) {
    try {
      const list = execSync("turso db list", { encoding: "utf8" })
      const names = list
        .split("\n")
        .map((line) => line.trim().split(/\s+/)[0])
        .filter((n) => n && n !== "NAME" && !n.startsWith("-"))
      if (names.length === 1) name = names[0]
    } catch {
      return null
    }
  }
  if (!name) return null

  try {
    const url = execSync(`turso db show ${name} --url`, { encoding: "utf8" }).trim()
    const token = execSync(`turso db tokens create ${name}`, { encoding: "utf8" }).trim()
    console.log(`Using Turso CLI credentials for database "${name}"`)
    return { url, token }
  } catch {
    return null
  }
}

async function promptForTurso() {
  console.log("")
  console.log("Turso credentials are empty in .env.local (Vercel has blank values: \"\").")
  console.log("Paste them from https://turso.tech/app → your database → Connect")
  console.log("(Sensitive vars DO pull from Vercel when they have real values — Neon works.)")
  console.log("")

  const rl = readline.createInterface({ input, output })
  try {
    const url = await rl.question("TURSO_DATABASE_URL (libsql://... or https://...): ")
    const token = await rl.question("TURSO_AUTH_TOKEN: ")
    return { url: url.trim(), token: token.trim() }
  } finally {
    rl.close()
  }
}

async function resolveTursoCredentials() {
  const cli = parseCliArgs()

  let url = cli.url || process.env.TURSO_DATABASE_URL || process.env.TURSO_URL
  let token = cli.token || process.env.TURSO_AUTH_TOKEN

  if (!missing("TURSO_DATABASE_URL", url) && !missing("TURSO_AUTH_TOKEN", token)) {
    return { url, token }
  }

  const fromCli = tryTursoCli(cli.dbName)
  if (fromCli) return fromCli

  if (!process.stdin.isTTY) {
    console.error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are empty.")
    console.error("Fix in Vercel (v0-ren → Environment Variables) or run:")
    console.error("  node scripts/migrate-neon-to-turso.mjs --turso-url=... --turso-token=...")
    process.exit(1)
  }

  return promptForTurso()
}

const schemaPath = path.join(__dirname, "schema-turso.sql")
let schemaSql = fs.readFileSync(schemaPath, "utf8")

schemaSql = schemaSql
  .replace(/DEFAULT '\{\}'\[\]/g, "DEFAULT '[]'")
  .replace(
    /CREATE TABLE IF NOT EXISTS app_settings \(\n  key TEXT NOT NULL,/,
    "CREATE TABLE IF NOT EXISTS app_settings (\n  key TEXT PRIMARY KEY NOT NULL,",
  )

const adminTables = `
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'admin',
  password_hash TEXT,
  must_change_password INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_magic_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  admin_email TEXT,
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`

async function migrateTable(pg, turso, table) {
  // neon() is a callable query function — not pg.query()
  const rows = await pg(`SELECT * FROM ${table}`, [])
  if (!rows.length) {
    console.log(`  ${table}: 0 rows (skip)`)
    return
  }

  const columns = Object.keys(rows[0])
  const placeholders = columns.map(() => "?").join(", ")
  const insertSql = `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`

  for (const row of rows) {
    const values = columns.map((col) => {
      const value = row[col]
      if (value === null || value === undefined) return null
      if (typeof value === "boolean") return value ? 1 : 0
      if (value instanceof Date) return value.toISOString()
      if (typeof value === "object") return JSON.stringify(value)
      return value
    })
    await turso.execute({ sql: insertSql, args: values })
  }

  console.log(`  ${table}: ${rows.length} rows`)
}

async function run() {
  loadEnvFiles()

  const neonUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL
  if (missing("NEON_DATABASE_URL", neonUrl)) {
    console.error("Missing NEON_DATABASE_URL. Run:")
    console.error("  vercel env pull .env.local --environment=production")
    process.exit(1)
  }

  const { url: tursoUrl, token: tursoToken } = await resolveTursoCredentials()
  if (missing("TURSO_DATABASE_URL", tursoUrl) || missing("TURSO_AUTH_TOKEN", tursoToken)) {
    console.error("Turso credentials are still empty. Aborting.")
    process.exit(1)
  }

  const pg = neon(neonUrl)
  const turso = createClient({ url: tursoUrl, authToken: tursoToken })

  console.log("Applying Turso schema...")

  const statements = `${schemaSql}\n${adminTables}`
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)

  for (const statement of statements) {
    await turso.execute(statement)
  }

  const tables = await pg`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `

  console.log(`Migrating ${tables.length} tables from Neon → Turso...`)
  for (const { table_name } of tables) {
    await migrateTable(pg, turso, table_name)
  }

  console.log("Done.")
  console.log("")
  console.log("Next: update Vercel with the same Turso URL + token, then redeploy v0-ren.")
}

run().catch((error) => {
  console.error("Migration failed:", error)
  process.exit(1)
})
