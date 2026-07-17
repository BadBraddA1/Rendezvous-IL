import { randomUUID } from "crypto"
import { sql, type SqlRow } from "@/lib/db"
import { publishChatEvent } from "@/lib/ably"
import { userCanAccessChannel, userCanModerateChannel } from "@/lib/chat/channels"
import {
  enrichMessages,
  enrichSingleMessage,
  rowToBaseMessage,
} from "@/lib/chat/message-enrichment"
import { notifyChatMessagePush } from "@/lib/chat/notify"
import { MAX_CHAT_PHOTOS_PER_MESSAGE } from "@/lib/chat/reactions"
import { ensureChatSchema } from "@/lib/chat-schema"
import type { ChatMessageKind, ChatMessagePayload } from "@/types/chat"

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
  const bases = page.map(rowToBaseMessage).reverse()
  const messages = await enrichMessages(bases, options.clerkUserId)
  const nextCursor = hasMore && page.length > 0 ? String(page[page.length - 1].id) : null

  return { messages, nextCursor, hasMore }
}

export async function sendChannelMessage(input: {
  channelId: string
  body: string
  imageUrls?: string[]
  clerkUserId: string
  email?: string
  isAdmin: boolean
  displayName: string
  avatarUrl?: string | null
  isAnnouncement?: boolean
  kind?: ChatMessageKind
  pollQuestion?: string | null
  pollOptions?: string[] | null
}): Promise<ChatMessagePayload> {
  await ensureChatSchema()

  const kind: ChatMessageKind = input.kind === "poll" ? "poll" : "text"
  const body = input.body.trim()
  const imageUrls = (input.imageUrls ?? [])
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, MAX_CHAT_PHOTOS_PER_MESSAGE)
  const imageUrl = imageUrls[0] ?? null

  let pollQuestion: string | null = null
  let pollOptions: string[] | null = null

  if (kind === "poll") {
    const canModerate = await userCanModerateChannel(
      input.channelId,
      input.clerkUserId,
      input.isAdmin,
    )
    if (!canModerate) {
      throw new Error("Only admins and channel moderators can create polls")
    }
    pollQuestion = (input.pollQuestion ?? "").trim()
    pollOptions = (input.pollOptions ?? [])
      .map((o) => o.trim())
      .filter(Boolean)
      .slice(0, 6)
    if (!pollQuestion) throw new Error("Poll question is required")
    if (pollQuestion.length > 280) throw new Error("Poll question is too long")
    if (pollOptions.length < 2) throw new Error("Polls need at least 2 options")
    if (pollOptions.some((o) => o.length > 120)) throw new Error("Poll option is too long")
  } else {
    if (!body && imageUrls.length === 0) throw new Error("Message body or photo is required")
  }

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

  if (input.isAnnouncement) {
    const canModerate = await userCanModerateChannel(
      input.channelId,
      input.clerkUserId,
      input.isAdmin,
    )
    if (!canModerate) {
      throw new Error("Only admins and channel moderators can post announcements")
    }
  }

  const id = randomUUID()
  const imageUrlsJson = imageUrls.length > 0 ? JSON.stringify(imageUrls) : null
  const pollOptionsJson = pollOptions ? JSON.stringify(pollOptions) : null
  // Explicit ISO UTC so clients never see bare SQLite CURRENT_TIMESTAMP.
  const createdAt = new Date().toISOString()

  await sql`
    INSERT INTO chat_messages (
      id,
      channel_id,
      sender_clerk_id,
      sender_display_name,
      sender_avatar_url,
      body,
      image_url,
      image_urls,
      kind,
      poll_question,
      poll_options,
      is_announcement,
      created_at
    ) VALUES (
      ${id},
      ${input.channelId},
      ${input.clerkUserId},
      ${input.displayName},
      ${input.avatarUrl ?? null},
      ${kind === "poll" ? pollQuestion! : body},
      ${imageUrl},
      ${imageUrlsJson},
      ${kind},
      ${pollQuestion},
      ${pollOptionsJson},
      ${input.isAnnouncement ? 1 : 0},
      ${createdAt}
    )
  `

  const [row] = await sql`
    SELECT * FROM chat_messages WHERE id = ${id} LIMIT 1
  `
  const message = row
    ? await enrichSingleMessage(row, input.clerkUserId)
    : {
        id,
        channel_id: input.channelId,
        sender_clerk_id: input.clerkUserId,
        sender_display_name: input.displayName,
        sender_avatar_url: input.avatarUrl ?? null,
        body: kind === "poll" ? pollQuestion! : body,
        image_url: imageUrl,
        image_urls: imageUrls,
        kind,
        is_announcement: Boolean(input.isAnnouncement),
        poll_question: pollQuestion,
        poll_options: pollOptions,
        poll_counts: pollOptions ? pollOptions.map(() => 0) : null,
        my_vote: null,
        reactions: [],
        created_at: new Date().toISOString(),
      }

  const channelTitle = await channelTitleForPush(input.channelId)

  await Promise.all([
    publishChatEvent(input.channelId, "message", message as unknown as Record<string, unknown>).catch(
      (error) => console.error("[chat] Ably publish failed:", error),
    ),
    notifyChatMessagePush({
      channelId: input.channelId,
      channelTitle,
      message,
    }),
  ])

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
}): Promise<{ deleted: boolean; channelId?: string }> {
  await ensureChatSchema()

  const [row] = await sql`
    SELECT id, channel_id, sender_clerk_id
    FROM chat_messages
    WHERE id = ${input.messageId}
      AND deleted_at IS NULL
    LIMIT 1
  `
  if (!row) return { deleted: false }

  const channelId = String(row.channel_id)
  const isOwner = String(row.sender_clerk_id) === input.clerkUserId
  const canModerate = await userCanModerateChannel(channelId, input.clerkUserId, input.isAdmin)
  if (!isOwner && !canModerate) {
    throw new Error("Forbidden")
  }

  await sql`
    UPDATE chat_messages
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = ${input.messageId}
  `

  await publishChatEvent(channelId, "message_deleted", {
    id: input.messageId,
    channel_id: channelId,
  }).catch((error) => console.error("[chat] Ably delete publish failed:", error))

  return { deleted: true, channelId }
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
