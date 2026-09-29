/**
 * Organizer announcements — live now, or scheduled for a Central Time publish.
 * Optional app push when created live or when the cron publisher fires.
 */

import { sql } from "@/lib/db"
import { sendBroadcastPush } from "@/lib/broadcast-push"

export type AnnouncementRow = {
  id: number
  title: string
  message: string
  priority: string
  is_active: boolean
  show_on_live_updates: boolean
  show_on_schedule: boolean
  send_push: boolean
  publish_at: string | null
  push_sent_at: string | null
  schedule_event_id: number | null
  expires_at: string | null
  created_by: string | null
  created_at: string
}

let schemaEnsured = false

export async function ensureAnnouncementsSchema(): Promise<void> {
  if (schemaEnsured) return
  await sql`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      priority TEXT DEFAULT 'normal',
      is_active INTEGER DEFAULT 1,
      show_on_schedule INTEGER DEFAULT 1,
      show_on_live_updates INTEGER DEFAULT 1,
      sent_to_groupme INTEGER DEFAULT 0,
      groupme_message_id TEXT,
      expires_at TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `
  const alters = [
    `ALTER TABLE announcements ADD COLUMN send_push INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE announcements ADD COLUMN publish_at TEXT`,
    `ALTER TABLE announcements ADD COLUMN push_sent_at TEXT`,
    `ALTER TABLE announcements ADD COLUMN schedule_event_id INTEGER`,
  ]
  for (const statement of alters) {
    try {
      await sql.query(statement)
    } catch {
      // column already exists
    }
  }
  schemaEnsured = true
}

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1"
}

function mapRow(row: Record<string, unknown>): AnnouncementRow {
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    priority: String(row.priority ?? "normal"),
    is_active: asBool(row.is_active),
    show_on_live_updates: asBool(row.show_on_live_updates),
    show_on_schedule: asBool(row.show_on_schedule),
    send_push: asBool(row.send_push),
    publish_at: row.publish_at != null ? String(row.publish_at) : null,
    push_sent_at: row.push_sent_at != null ? String(row.push_sent_at) : null,
    schedule_event_id:
      row.schedule_event_id != null && Number(row.schedule_event_id) > 0
        ? Number(row.schedule_event_id)
        : null,
    expires_at: row.expires_at != null ? String(row.expires_at) : null,
    created_by: row.created_by != null ? String(row.created_by) : null,
    created_at: String(row.created_at ?? ""),
  }
}

export type CreateAnnouncementInput = {
  title: string
  message: string
  priority?: string
  showOnLiveUpdates?: boolean
  showOnSchedule?: boolean
  sendPush?: boolean
  /** ISO-8601 with offset (America/Chicago). Null/omit = publish immediately. */
  publishAt?: string | null
  scheduleEventId?: number | null
  createdBy?: string
  expiresAt?: string | null
}

export async function createAnnouncement(
  input: CreateAnnouncementInput,
): Promise<{ announcement: AnnouncementRow; push?: Awaited<ReturnType<typeof sendBroadcastPush>> }> {
  await ensureAnnouncementsSchema()

  const title = input.title.trim()
  const message = input.message.trim()
  if (!title || !message) {
    throw new Error("Title and message are required")
  }

  const rawPublish = input.publishAt?.trim() || null
  let publishAt: string | null = null
  if (rawPublish) {
    const parsed = new Date(rawPublish)
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid publishAt datetime")
    }
    publishAt = parsed.toISOString()
  }
  const publishNow = !publishAt || new Date(publishAt).getTime() <= Date.now()
  const sendPush = Boolean(input.sendPush)
  const showLive = Boolean(input.showOnLiveUpdates)
  const showSchedule = Boolean(input.showOnSchedule)
  const priority = input.priority || "normal"
  const createdBy = input.createdBy || "admin"
  const scheduleEventId = input.scheduleEventId ?? null
  const expiresAt = input.expiresAt ?? null

  const [row] = await sql`
    INSERT INTO announcements (
      title, message, priority, is_active,
      show_on_live_updates, show_on_schedule,
      sent_to_groupme, created_by, expires_at,
      send_push, publish_at, schedule_event_id
    ) VALUES (
      ${title}, ${message}, ${priority}, ${publishNow ? 1 : 0},
      ${showLive ? 1 : 0}, ${showSchedule ? 1 : 0},
      0, ${createdBy}, ${expiresAt},
      ${sendPush ? 1 : 0}, ${publishAt}, ${scheduleEventId}
    )
    RETURNING *
  `

  const announcement = mapRow(row as Record<string, unknown>)
  let push: Awaited<ReturnType<typeof sendBroadcastPush>> | undefined

  if (publishNow && sendPush) {
    push = await sendBroadcastPush({ title, message })
    if (push.success) {
      await sql`
        UPDATE announcements
        SET push_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${announcement.id}
      `
      announcement.push_sent_at = new Date().toISOString()
    }
  }

  return { announcement, push }
}

export async function listAdminAnnouncements(limit = 50): Promise<AnnouncementRow[]> {
  await ensureAnnouncementsSchema()
  const rows = await sql`
    SELECT
      id, title, message, priority, is_active,
      show_on_live_updates, show_on_schedule,
      send_push, publish_at, push_sent_at, schedule_event_id,
      created_at, expires_at, created_by
    FROM announcements
    ORDER BY
      CASE WHEN is_active = 0 AND publish_at IS NOT NULL THEN 0 ELSE 1 END,
      publish_at ASC,
      created_at DESC
    LIMIT ${limit}
  `
  return rows.map((r) => mapRow(r as Record<string, unknown>))
}

/**
 * Activate due scheduled announcements and send pending pushes.
 * Idempotent — safe to run every minute.
 */
export async function publishDueAnnouncements(): Promise<{
  published: number
  pushed: number
  errors: string[]
}> {
  await ensureAnnouncementsSchema()
  const nowIso = new Date().toISOString()
  const due = await sql`
    SELECT *
    FROM announcements
    WHERE is_active = 0
      AND publish_at IS NOT NULL
      AND publish_at <= ${nowIso}
    ORDER BY publish_at ASC
    LIMIT 50
  `

  let published = 0
  let pushed = 0
  const errors: string[] = []

  for (const raw of due) {
    const row = mapRow(raw as Record<string, unknown>)
    try {
      await sql`
        UPDATE announcements
        SET is_active = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${row.id}
      `
      published += 1

      if (row.send_push && !row.push_sent_at) {
        const push = await sendBroadcastPush({
          title: row.title,
          message: row.message,
        })
        if (push.success) {
          await sql`
            UPDATE announcements
            SET push_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${row.id}
          `
          pushed += 1
        } else {
          errors.push(`#${row.id} push: ${push.error || "failed"}`)
        }
      }
    } catch (error) {
      errors.push(
        `#${row.id}: ${error instanceof Error ? error.message : "publish failed"}`,
      )
    }
  }

  return { published, pushed, errors }
}
