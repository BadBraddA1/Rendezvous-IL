import { sql, type SqlRow } from "@/lib/db"
import { ensureChatSchema } from "@/lib/chat-schema"
import type { PhotoshowPhoto } from "@/lib/live-updates/photoshow-shared"
import type { RegistrationEventYear } from "@/lib/registration-event-years"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

/** Cap so room TVs stay responsive even if a chat has hundreds of photos. */
export const CHAT_PHOTOSHOW_MAX_PHOTOS = 300

export interface ChatPhotoshowChannel {
  id: string
  name: string
  channel_type: "year" | "custom"
  event_year: RegistrationEventYear | null
  is_active: boolean
  is_test: boolean
  photo_count: number
  hidden_count: number
  /** Path for a dedicated room TV (same origin). */
  tv_path: string
}

let hiddenSchemaReady = false

export async function ensureChatPhotoshowHiddenSchema(): Promise<void> {
  if (hiddenSchemaReady) return
  await sql.query(`
    CREATE TABLE IF NOT EXISTS live_updates_chat_photoshow_hidden (
      photo_id TEXT PRIMARY KEY NOT NULL,
      channel_id TEXT NOT NULL,
      hidden_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      hidden_by TEXT
    )
  `)
  await sql.query(`
    CREATE INDEX IF NOT EXISTS idx_chat_photoshow_hidden_channel
    ON live_updates_chat_photoshow_hidden (channel_id)
  `)
  hiddenSchemaReady = true
}

function parseMessageImageUrls(row: SqlRow): string[] {
  const raw = row.image_urls
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return parsed.filter((u): u is string => typeof u === "string" && u.trim().length > 0)
      }
    } catch {
      // fall through
    }
  }
  if (row.image_url != null && String(row.image_url).trim()) {
    return [String(row.image_url)]
  }
  return []
}

function captionFromBody(row: SqlRow): string | null {
  const body = String(row.body ?? "").trim()
  return body ? body.slice(0, 200) : null
}

function submittedByFromRow(row: SqlRow): string | null {
  const sender = String(row.sender_display_name ?? "").trim()
  return sender || null
}

export function chatPhotoshowTvPath(channelId: string): string {
  return `/live-updates?kiosk=1&view=photoshow&channel=${encodeURIComponent(channelId)}`
}

async function listHiddenPhotoIds(channelId?: string): Promise<Set<string>> {
  await ensureChatPhotoshowHiddenSchema()
  const rows = channelId
    ? await sql`
        SELECT photo_id FROM live_updates_chat_photoshow_hidden
        WHERE channel_id = ${channelId}
      `
    : await sql`SELECT photo_id FROM live_updates_chat_photoshow_hidden`
  return new Set(rows.map((row) => String(row.photo_id)))
}

function photosFromMessageRows(
  rows: SqlRow[],
  channelId: string,
  hiddenIds: Set<string>,
  options: { includeHidden: boolean },
): PhotoshowPhoto[] {
  const photos: PhotoshowPhoto[] = []
  for (const row of rows) {
    const urls = parseMessageImageUrls(row)
    const caption = captionFromBody(row)
    const submittedBy = submittedByFromRow(row)
    const createdAt = String(row.created_at)
    const messageId = String(row.id)
    for (let i = 0; i < urls.length; i++) {
      if (photos.length >= CHAT_PHOTOSHOW_MAX_PHOTOS) break
      const id = urls.length === 1 ? messageId : `${messageId}-${i}`
      const hidden = hiddenIds.has(id)
      if (hidden && !options.includeHidden) continue
      photos.push({
        id,
        image_url: urls[i],
        caption,
        submitted_by: submittedBy,
        sort_order: photos.length,
        is_active: !hidden,
        created_at: createdAt,
        channel_id: channelId,
      })
    }
    if (photos.length >= CHAT_PHOTOSHOW_MAX_PHOTOS) break
  }
  return photos
}

/** Photos posted in a chat channel, oldest first, shaped for the TV slideshow. */
export async function listChatChannelPhotoshowPhotos(
  channelId: string,
  options: { includeHidden?: boolean } = {},
): Promise<PhotoshowPhoto[]> {
  await ensureChatSchema()
  await ensureChatPhotoshowHiddenSchema()

  const id = channelId.trim()
  if (!id) return []

  const [channel] = await sql`
    SELECT id FROM chat_channels WHERE id = ${id} LIMIT 1
  `
  if (!channel) return []

  const includeHidden = Boolean(options.includeHidden)
  const hiddenIds = await listHiddenPhotoIds(id)

  const rows = await sql`
    SELECT id, body, image_url, image_urls, sender_display_name, created_at
    FROM chat_messages
    WHERE channel_id = ${id}
      AND deleted_at IS NULL
      AND (
        (image_url IS NOT NULL AND TRIM(image_url) != '')
        OR (image_urls IS NOT NULL AND TRIM(image_urls) != '' AND image_urls != '[]' AND image_urls != 'null')
      )
    ORDER BY created_at ASC
    LIMIT ${CHAT_PHOTOSHOW_MAX_PHOTOS * 2}
  `

  return photosFromMessageRows(rows as SqlRow[], id, hiddenIds, { includeHidden })
}

export async function setChatPhotoshowPhotoHidden(input: {
  photoId: string
  channelId: string
  hidden: boolean
  hiddenBy?: string | null
}): Promise<void> {
  await ensureChatPhotoshowHiddenSchema()
  const photoId = input.photoId.trim()
  const channelId = input.channelId.trim()
  if (!photoId || !channelId) throw new Error("photoId and channelId are required")

  if (input.hidden) {
    await sql`
      INSERT INTO live_updates_chat_photoshow_hidden (photo_id, channel_id, hidden_at, hidden_by)
      VALUES (${photoId}, ${channelId}, datetime('now'), ${input.hiddenBy?.trim() || null})
      ON CONFLICT(photo_id) DO UPDATE SET
        channel_id = excluded.channel_id,
        hidden_at = datetime('now'),
        hidden_by = excluded.hidden_by
    `
  } else {
    await sql`
      DELETE FROM live_updates_chat_photoshow_hidden WHERE photo_id = ${photoId}
    `
  }
}

/** Every chat channel with how many photos it can feed into a photoshow. */
export async function listChatPhotoshowChannels(): Promise<ChatPhotoshowChannel[]> {
  await ensureChatSchema()
  await ensureChatPhotoshowHiddenSchema()

  const channels = await sql`
    SELECT id, name, channel_type, event_year, is_active, is_test
    FROM chat_channels
    ORDER BY
      CASE WHEN channel_type = 'year' THEN 0 ELSE 1 END,
      event_year DESC,
      name ASC
  `

  if (channels.length === 0) return []

  const ids = channels.map((c) => String(c.id))
  const placeholders = ids.map(() => "?").join(", ")
  const messageRows = await sql.query(
    `SELECT id, channel_id, image_url, image_urls
     FROM chat_messages
     WHERE deleted_at IS NULL
       AND channel_id IN (${placeholders})
       AND (
         (image_url IS NOT NULL AND TRIM(image_url) != '')
         OR (image_urls IS NOT NULL AND TRIM(image_urls) != '' AND image_urls != '[]' AND image_urls != 'null')
       )`,
    ids,
  )

  const hiddenIds = await listHiddenPhotoIds()
  const visibleByChannel = new Map<string, number>()
  const hiddenByChannel = new Map<string, number>()

  for (const row of messageRows) {
    const channelId = String(row.channel_id)
    const messageId = String(row.id)
    const urls = parseMessageImageUrls(row as SqlRow)
    for (let i = 0; i < urls.length; i++) {
      const photoId = urls.length === 1 ? messageId : `${messageId}-${i}`
      if (hiddenIds.has(photoId)) {
        hiddenByChannel.set(channelId, (hiddenByChannel.get(channelId) ?? 0) + 1)
      } else {
        visibleByChannel.set(channelId, (visibleByChannel.get(channelId) ?? 0) + 1)
      }
    }
  }

  return channels.map((row) => {
    const id = String(row.id)
    return {
      id,
      name: String(row.name),
      channel_type: String(row.channel_type) === "custom" ? "custom" : "year",
      event_year:
        row.event_year != null
          ? parseRegistrationEventYear(String(row.event_year))
          : null,
      is_active: Number(row.is_active) === 1,
      is_test: Number(row.is_test) === 1,
      photo_count: Math.min(visibleByChannel.get(id) ?? 0, CHAT_PHOTOSHOW_MAX_PHOTOS),
      hidden_count: hiddenByChannel.get(id) ?? 0,
      tv_path: chatPhotoshowTvPath(id),
    }
  })
}
