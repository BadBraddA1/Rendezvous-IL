import { sql } from "@/lib/db"
import {
  REGISTRATION_EVENT_YEARS,
  registrationYearLabel,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"

let schemaEnsured = false

export function yearChannelId(year: RegistrationEventYear): string {
  return `year-${year}`
}

export async function ensureChatSchema(): Promise<void> {
  if (schemaEnsured) return

  await sql.query(`
    CREATE TABLE IF NOT EXISTS chat_channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      channel_type TEXT NOT NULL DEFAULT 'year',
      event_year INTEGER,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_test INTEGER NOT NULL DEFAULT 0,
      created_by_clerk_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await sql.query(`
    CREATE TABLE IF NOT EXISTS chat_channel_members (
      channel_id TEXT NOT NULL,
      clerk_user_id TEXT NOT NULL,
      joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (channel_id, clerk_user_id)
    )
  `)

  await sql.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      sender_clerk_id TEXT NOT NULL,
      sender_display_name TEXT NOT NULL,
      sender_avatar_url TEXT,
      body TEXT NOT NULL,
      is_announcement INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await sql.query(`
    CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created
    ON chat_messages (channel_id, created_at DESC)
  `)

  for (const year of REGISTRATION_EVENT_YEARS) {
    const id = yearChannelId(year)
    const name = `${registrationYearLabel(year)} Chat`
    await sql`
      INSERT INTO chat_channels (id, name, channel_type, event_year, description, is_active, is_test)
      VALUES (
        ${id},
        ${name},
        'year',
        ${year},
        ${`Group chat for families registered for Rendezvous ${year}.`},
        1,
        0
      )
      ON CONFLICT (id) DO NOTHING
    `
  }

  schemaEnsured = true
}
