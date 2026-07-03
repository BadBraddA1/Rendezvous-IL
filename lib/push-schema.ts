import { sql } from "@/lib/db"

let schemaEnsured = false

/** Create push token tables if missing (production Turso may predate these). */
export async function ensurePushSchema(): Promise<void> {
  if (schemaEnsured) return

  await sql.query(`
    CREATE TABLE IF NOT EXISTS ios_device_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      bundle_id TEXT NOT NULL DEFAULT 'com.rendezvousil.braddcorp.app',
      environment TEXT NOT NULL DEFAULT 'production',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await sql.query(`
    CREATE TABLE IF NOT EXISTS ios_activity_push_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      activity_token TEXT NOT NULL UNIQUE,
      bundle_id TEXT NOT NULL DEFAULT 'com.rendezvousil.braddcorp.app',
      environment TEXT NOT NULL DEFAULT 'production',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await sql.query(`
    CREATE TABLE IF NOT EXISTS android_device_tokens (
      token TEXT PRIMARY KEY NOT NULL,
      bundle_id TEXT NOT NULL DEFAULT 'com.rendezvousil.app',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  schemaEnsured = true
}
