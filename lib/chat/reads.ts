import { sql } from "@/lib/db"
import { ensureChatSchema } from "@/lib/chat-schema"
import type { ChatChannelSummary } from "@/types/chat"

/** Persist / update the user's read cursor for a channel. */
export async function markChannelRead(
  channelId: string,
  clerkUserId: string,
  at: string = new Date().toISOString(),
): Promise<void> {
  await ensureChatSchema()
  await sql`
    INSERT INTO chat_channel_reads (channel_id, clerk_user_id, last_read_at)
    VALUES (${channelId}, ${clerkUserId}, ${at})
    ON CONFLICT (channel_id, clerk_user_id) DO UPDATE SET
      last_read_at = CASE
        WHEN excluded.last_read_at > chat_channel_reads.last_read_at
        THEN excluded.last_read_at
        ELSE chat_channel_reads.last_read_at
      END
  `
}

/**
 * Attach unread_count (messages from others after last read) and sort by
 * newest activity first. Channels with no read cursor only count messages
 * from the last 7 days so opening chat for the first time is not flooded.
 */
export async function attachUnreadCountsAndSort(
  summaries: ChatChannelSummary[],
  clerkUserId: string,
): Promise<ChatChannelSummary[]> {
  if (summaries.length === 0) return summaries
  await ensureChatSchema()

  const ids = summaries.map((c) => c.id)
  const placeholders = ids.map(() => "?").join(", ")
  // ISO fallback so string compare matches message created_at timestamps.
  const unreadSinceFallback = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const rows = await sql.query(
    `SELECT m.channel_id AS channel_id, COUNT(*) AS unread
     FROM chat_messages m
     LEFT JOIN chat_channel_reads r
       ON r.channel_id = m.channel_id
      AND r.clerk_user_id = ?
     WHERE m.channel_id IN (${placeholders})
       AND m.deleted_at IS NULL
       AND m.sender_clerk_id != ?
       AND m.created_at > COALESCE(r.last_read_at, ?)
     GROUP BY m.channel_id`,
    [clerkUserId, ...ids, clerkUserId, unreadSinceFallback],
  )

  const unreadByChannel = new Map<string, number>()
  for (const row of rows) {
    unreadByChannel.set(String(row.channel_id), Number(row.unread ?? 0))
  }

  const withUnread = summaries.map((channel) => ({
    ...channel,
    unread_count: unreadByChannel.get(channel.id) ?? 0,
  }))

  return sortChannelsByActivity(withUnread)
}

export function sortChannelsByActivity(
  channels: ChatChannelSummary[],
): ChatChannelSummary[] {
  return [...channels].sort((a, b) => {
    const aTime = a.last_message_at ? Date.parse(a.last_message_at) : 0
    const bTime = b.last_message_at ? Date.parse(b.last_message_at) : 0
    if (aTime !== bTime) return bTime - aTime
    // Prefer channels with unreads when timestamps tie / missing.
    const aUnread = a.unread_count ?? 0
    const bUnread = b.unread_count ?? 0
    if (aUnread !== bUnread) return bUnread - aUnread
    return a.name.localeCompare(b.name)
  })
}
