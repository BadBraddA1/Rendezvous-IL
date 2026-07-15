#!/usr/bin/env node
/**
 * Ensure "Demo Chat" test channel + ~20 sample messages for App Review.
 * Run: vercel env run -- pnpm exec tsx scripts/seed-demo-chat.ts
 *   or: node scripts/seed-demo-chat.mjs  (with env already loaded)
 */
import { createClient } from "@libsql/client"
import { loadEnvFiles } from "./load-env.mjs"
import { randomUUID } from "node:crypto"

loadEnvFiles()

const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || process.env.LIBSQL_URL
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL / TURSO_AUTH_TOKEN")
  process.exit(1)
}

const db = createClient({ url, authToken })

const CHANNEL_NAME = "Demo Chat"

const SEED = [
  ["seed-organizer", "Rendezvous Team", "Welcome to Demo Chat — this is a sample year-group conversation for App Review. Feel free to send a message!", 1, 60 * 24 * 3],
  ["seed-mark", "Mark Anderson", "Looking forward to seeing everyone at Lake Williamson again this year.", 0, 60 * 24 * 3 - 40],
  ["seed-sarah", "Sarah Anderson", "Same here! Anyone else driving up Monday afternoon?", 0, 60 * 24 * 3 - 55],
  ["seed-james", "James Bennett", "We are — leaving Peoria around 1pm. Happy to caravan if anyone is along I-55.", 0, 60 * 24 * 2 + 300],
  ["seed-rachel", "Rachel Bennett", "First year for our family. How early should we arrive for check-in?", 0, 60 * 24 * 2 + 240],
  ["seed-organizer", "Rendezvous Team", "Check-in opens Monday at 2:00 PM at the lodge. Bring your confirmation email or QR code from the app.", 1, 60 * 24 * 2 + 200],
  ["seed-david", "David Carter", "Is the campus map in the app up to date? We want to find the cafeteria before the evening meal.", 0, 60 * 24 * 2 + 120],
  ["seed-amy", "Amy Carter", "Yes — More → Campus map, or open a schedule location and it jumps to the pin.", 0, 60 * 24 * 2 + 100],
  ["seed-sarah", "Sarah Anderson", "Bible Bowl theme looks great this year. Anyone already practicing with their kids?", 0, 60 * 24 + 400],
  ["seed-james", "James Bennett", "We have been! The Study link under More → Bible Bowl has been a big help.", 0, 60 * 24 + 360],
  ["seed-mark", "Mark Anderson", "Who has cabin recommendations near the playground? We have little ones this year.", 0, 60 * 24 + 280],
  ["seed-david", "David Carter", "We stayed in the family cabin loop last year — short walk to the playground and dining hall.", 0, 60 * 24 + 250],
  ["seed-rachel", "Rachel Bennett", "Are meal tickets in the schedule, or do we just show up?", 0, 60 * 18],
  ["seed-organizer", "Rendezvous Team", "Meals are included with registration. Times are on the Schedule tab; allergies can be noted on your family profile.", 1, 60 * 17],
  ["seed-amy", "Amy Carter", "Worship night Tuesday was one of our favorites last year. Bring a jacket — the lake can cool off!", 0, 60 * 12],
  ["demo-chat-reviewer", "App Review", "Our family is excited — first time attending. Thanks for all the tips!", 0, 60 * 8],
  ["seed-sarah", "Sarah Anderson", "You will love it. Save space for freeze popcorn and late-night talks at the lodge.", 0, 60 * 7],
  ["seed-james", "James Bennett", "Is there a quiet spot for nursing moms / nap time? Asking for a friend 😄", 0, 60 * 5],
  ["seed-rachel", "Rachel Bennett", "The family lounge near the dining hall worked well for us during afternoon rest.", 0, 60 * 4],
  ["seed-organizer", "Rendezvous Team", "Reminder: push notifications are optional in More → Notifications. Enable them for organizer announcements during the week.", 1, 90],
]

await db.execute(`
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

await db.execute(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    sender_clerk_id TEXT NOT NULL,
    sender_display_name TEXT NOT NULL,
    sender_avatar_url TEXT,
    body TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    is_announcement INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`)

// Prefer the existing Admin "Demo Chat" (UUID id). Fall back to creating demo-chat.
let channelId = null
const existing = await db.execute({
  sql: `SELECT id FROM chat_channels WHERE name = ? AND is_test = 1 ORDER BY created_at ASC LIMIT 1`,
  args: [CHANNEL_NAME],
})
if (existing.rows[0]) {
  channelId = String(existing.rows[0].id)
} else {
  channelId = "demo-chat"
  await db.execute({
    sql: `
      INSERT INTO chat_channels (
        id, name, channel_type, event_year, description, is_active, is_test
      ) VALUES (?, ?, 'custom', NULL, ?, 1, 1)
      ON CONFLICT (id) DO UPDATE SET
        name = excluded.name,
        is_active = 1,
        is_test = 1,
        updated_at = CURRENT_TIMESTAMP
    `,
    args: [
      channelId,
      CHANNEL_NAME,
      "App Review demo room — sample conversation for testers.",
    ],
  })
}

await db.execute({
  sql: `
    DELETE FROM chat_messages
    WHERE channel_id = ?
      AND (
        sender_clerk_id LIKE 'seed-%'
        OR sender_clerk_id = 'demo-chat-reviewer'
      )
  `,
  args: [channelId],
})

const now = Date.now()
for (const [senderId, senderName, body, isAnnouncement, minutesAgo] of SEED) {
  const createdAt = new Date(now - minutesAgo * 60_000).toISOString()
  await db.execute({
    sql: `
      INSERT INTO chat_messages (
        id, channel_id, sender_clerk_id, sender_display_name,
        sender_avatar_url, body, image_url, is_announcement, created_at
      ) VALUES (?, ?, ?, ?, NULL, ?, NULL, ?, ?)
    `,
    args: [randomUUID(), channelId, senderId, senderName, body, isAnnouncement, createdAt],
  })
}

const count = await db.execute({
  sql: `SELECT COUNT(*) AS c FROM chat_messages WHERE channel_id = ? AND deleted_at IS NULL`,
  args: [channelId],
})

console.log(
  `Demo Chat ready: channel=${channelId} messages=${count.rows[0].c} (seeded ${SEED.length})`,
)
