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
      clerk_user_id TEXT,
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
      clerk_user_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Older deployments created these tables without clerk_user_id.
  for (const statement of [
    `ALTER TABLE ios_device_tokens ADD COLUMN clerk_user_id TEXT`,
    `ALTER TABLE android_device_tokens ADD COLUMN clerk_user_id TEXT`,
  ]) {
    try {
      await sql.query(statement)
    } catch {
      // Column already exists
    }
  }

  await sql.query(`
    CREATE INDEX IF NOT EXISTS idx_ios_device_tokens_clerk
    ON ios_device_tokens (clerk_user_id)
  `)
  await sql.query(`
    CREATE INDEX IF NOT EXISTS idx_android_device_tokens_clerk
    ON android_device_tokens (clerk_user_id)
  `)

  schemaEnsured = true
}
