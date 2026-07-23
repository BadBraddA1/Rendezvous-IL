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
  /** Path for a dedicated room TV (same origin). */
  tv_path: string
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

function captionForMessage(row: SqlRow): string | null {
  const body = String(row.body ?? "").trim()
  if (body) return body.slice(0, 200)
  const sender = String(row.sender_display_name ?? "").trim()
  if (sender) return `Photo by ${sender}`
  return null
}

export function chatPhotoshowTvPath(channelId: string): string {
  return `/live-updates?kiosk=1&view=photoshow&channel=${encodeURIComponent(channelId)}`
}

/** Photos posted in a chat channel, oldest first, shaped for the TV slideshow. */
export async function listChatChannelPhotoshowPhotos(
  channelId: string,
): Promise<PhotoshowPhoto[]> {
  await ensureChatSchema()

  const id = channelId.trim()
  if (!id) return []

  const [channel] = await sql`
    SELECT id FROM chat_channels WHERE id = ${id} LIMIT 1
  `
  if (!channel) return []

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

  const photos: PhotoshowPhoto[] = []
  for (const row of rows) {
    const urls = parseMessageImageUrls(row as SqlRow)
    const caption = captionForMessage(row as SqlRow)
    const createdAt = String(row.created_at)
    const messageId = String(row.id)
    for (let i = 0; i < urls.length; i++) {
      if (photos.length >= CHAT_PHOTOSHOW_MAX_PHOTOS) break
      photos.push({
        id: urls.length === 1 ? messageId : `${messageId}-${i}`,
        image_url: urls[i],
        caption,
        sort_order: photos.length,
        is_active: true,
        created_at: createdAt,
      })
    }
    if (photos.length >= CHAT_PHOTOSHOW_MAX_PHOTOS) break
  }

  return photos
}

/** Every chat channel with how many photos it can feed into a photoshow. */
export async function listChatPhotoshowChannels(): Promise<ChatPhotoshowChannel[]> {
  await ensureChatSchema()

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
    `SELECT channel_id, image_url, image_urls
     FROM chat_messages
     WHERE deleted_at IS NULL
       AND channel_id IN (${placeholders})
       AND (
         (image_url IS NOT NULL AND TRIM(image_url) != '')
         OR (image_urls IS NOT NULL AND TRIM(image_urls) != '' AND image_urls != '[]' AND image_urls != 'null')
       )`,
    ids,
  )

  const countByChannel = new Map<string, number>()
  for (const row of messageRows) {
    const channelId = String(row.channel_id)
    const urls = parseMessageImageUrls(row as SqlRow)
    if (urls.length === 0) continue
    countByChannel.set(channelId, (countByChannel.get(channelId) ?? 0) + urls.length)
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
      photo_count: Math.min(countByChannel.get(id) ?? 0, CHAT_PHOTOSHOW_MAX_PHOTOS),
      tv_path: chatPhotoshowTvPath(id),
    }
  })
}
