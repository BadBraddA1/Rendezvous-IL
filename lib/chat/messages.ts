import { randomUUID } from "crypto"
import { sql, type SqlRow } from "@/lib/db"
import { publishChatMessage } from "@/lib/ably"
import { userCanAccessChannel } from "@/lib/chat/channels"
import { notifyChatMessagePush } from "@/lib/chat/notify"
import { ensureChatSchema } from "@/lib/chat-schema"
import type { ChatMessagePayload } from "@/types/chat"

function rowToMessage(row: SqlRow): ChatMessagePayload {
  return {
    id: String(row.id),
    channel_id: String(row.channel_id),
    sender_clerk_id: String(row.sender_clerk_id),
    sender_display_name: String(row.sender_display_name),
    sender_avatar_url: row.sender_avatar_url != null ? String(row.sender_avatar_url) : null,
    body: String(row.body),
    is_announcement: Number(row.is_announcement) === 1,
    created_at: String(row.created_at),
  }
}

export async function listChannelMessages(
  channelId: string,
  options: {
    clerkUserId: string
    email?: string
    isAdmin: boolean
    cursor?: string | null
    limit?: number
  },
): Promise<{ messages: ChatMessagePayload[]; nextCursor: string | null; hasMore: boolean }> {
  await ensureChatSchema()

  const canAccess = await userCanAccessChannel(
    channelId,
    options.clerkUserId,
    options.email,
    options.isAdmin,
  )
  if (!canAccess) {
    throw new Error("Forbidden")
  }

  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100)

  let rows: SqlRow[]
  if (options.cursor) {
    const [cursorRow] = await sql`
      SELECT created_at FROM chat_messages WHERE id = ${options.cursor} LIMIT 1
    `
    if (!cursorRow) {
      rows = []
    } else {
      rows = await sql`
        SELECT *
        FROM chat_messages
        WHERE channel_id = ${channelId}
          AND deleted_at IS NULL
          AND created_at < ${String(cursorRow.created_at)}
        ORDER BY created_at DESC
        LIMIT ${limit + 1}
      `
    }
  } else {
    rows = await sql`
      SELECT *
      FROM chat_messages
      WHERE channel_id = ${channelId}
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ${limit + 1}
    `
  }

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const messages = page.map(rowToMessage).reverse()
  const nextCursor = hasMore && page.length > 0 ? String(page[page.length - 1].id) : null

  return { messages, nextCursor, hasMore }
}

export async function sendChannelMessage(input: {
  channelId: string
  body: string
  clerkUserId: string
  email?: string
  isAdmin: boolean
  displayName: string
  avatarUrl?: string | null
  isAnnouncement?: boolean
}): Promise<ChatMessagePayload> {
  await ensureChatSchema()

  const body = input.body.trim()
  if (!body) throw new Error("Message body is required")
  if (body.length > 4000) throw new Error("Message is too long")

  const canAccess = await userCanAccessChannel(
    input.channelId,
    input.clerkUserId,
    input.email,
    input.isAdmin,
  )
  if (!canAccess) {
    throw new Error("Forbidden")
  }

  const id = randomUUID()
  await sql`
    INSERT INTO chat_messages (
      id,
      channel_id,
      sender_clerk_id,
      sender_display_name,
      sender_avatar_url,
      body,
      is_announcement
    ) VALUES (
      ${id},
      ${input.channelId},
      ${input.clerkUserId},
      ${input.displayName},
      ${input.avatarUrl ?? null},
      ${body},
      ${input.isAnnouncement ? 1 : 0}
    )
  `

  const message: ChatMessagePayload = {
    id,
    channel_id: input.channelId,
    sender_clerk_id: input.clerkUserId,
    sender_display_name: input.displayName,
    sender_avatar_url: input.avatarUrl ?? null,
    body,
    is_announcement: Boolean(input.isAnnouncement),
    created_at: new Date().toISOString(),
  }

  try {
    await publishChatMessage(input.channelId, message as unknown as Record<string, unknown>)
  } catch (error) {
    console.error("[chat] Ably publish failed:", error)
  }

  // Fire-and-forget push to other channel members (iOS / Android).
  const channelTitle = await channelTitleForPush(input.channelId)
  void notifyChatMessagePush({
    channelId: input.channelId,
    channelTitle,
    message,
  })

  return message
}

async function channelTitleForPush(channelId: string): Promise<string> {
  try {
    const [row] = await sql`
      SELECT name, channel_type, event_year
      FROM chat_channels
      WHERE id = ${channelId}
      LIMIT 1
    `
    if (!row) return "Rendezvous chat"
    if (String(row.channel_type) === "year" && row.event_year != null) {
      return `Rendezvous ${row.event_year}`
    }
    return String(row.name || "Rendezvous chat")
  } catch {
    return "Rendezvous chat"
  }
}

export async function deleteChannelMessage(input: {
  messageId: string
  clerkUserId: string
  isAdmin: boolean
}): Promise<boolean> {
  await ensureChatSchema()

  const [row] = await sql`
    SELECT id, sender_clerk_id
    FROM chat_messages
    WHERE id = ${input.messageId}
      AND deleted_at IS NULL
    LIMIT 1
  `
  if (!row) return false

  if (!input.isAdmin && String(row.sender_clerk_id) !== input.clerkUserId) {
    throw new Error("Forbidden")
  }

  await sql`
    UPDATE chat_messages
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = ${input.messageId}
  `
  return true
}

export function clerkDisplayName(user: {
  firstName?: string | null
  lastName?: string | null
  emailAddresses?: { emailAddress: string }[]
}): string {
  const parts = [user.firstName, user.lastName].filter(Boolean)
  if (parts.length > 0) return parts.join(" ")
  return user.emailAddresses?.[0]?.emailAddress ?? "Rendezvous attendee"
}
