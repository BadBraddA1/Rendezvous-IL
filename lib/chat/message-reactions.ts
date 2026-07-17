import { sql } from "@/lib/db"
import { publishChatEvent } from "@/lib/ably"
import { userCanAccessChannel } from "@/lib/chat/channels"
import { loadReactionSummaries } from "@/lib/chat/message-enrichment"
import { isAllowedChatReaction } from "@/lib/chat/reactions"
import { notifyChatReactionPush } from "@/lib/chat/notify"
import { ensureChatSchema } from "@/lib/chat-schema"
import type { ChatReactionUpdatedPayload } from "@/types/chat"

export async function toggleMessageReaction(input: {
  messageId: string
  emoji: string
  clerkUserId: string
  email?: string
  isAdmin: boolean
  actorDisplayName: string
}): Promise<ChatReactionUpdatedPayload & { added: boolean }> {
  await ensureChatSchema()

  if (!isAllowedChatReaction(input.emoji)) {
    throw new Error("That reaction is not allowed")
  }

  const [row] = await sql`
    SELECT id, channel_id, sender_clerk_id, deleted_at
    FROM chat_messages
    WHERE id = ${input.messageId}
    LIMIT 1
  `
  if (!row || row.deleted_at != null) throw new Error("Message not found")

  const channelId = String(row.channel_id)
  const authorClerkId = String(row.sender_clerk_id)

  const canAccess = await userCanAccessChannel(
    channelId,
    input.clerkUserId,
    input.email,
    input.isAdmin,
  )
  if (!canAccess) throw new Error("Forbidden")

  const [existing] = await sql`
    SELECT emoji FROM chat_message_reactions
    WHERE message_id = ${input.messageId}
      AND clerk_user_id = ${input.clerkUserId}
      AND emoji = ${input.emoji}
    LIMIT 1
  `

  let added = false
  if (existing) {
    await sql`
      DELETE FROM chat_message_reactions
      WHERE message_id = ${input.messageId}
        AND clerk_user_id = ${input.clerkUserId}
        AND emoji = ${input.emoji}
    `
  } else {
    await sql`
      INSERT INTO chat_message_reactions (message_id, clerk_user_id, emoji)
      VALUES (${input.messageId}, ${input.clerkUserId}, ${input.emoji})
    `
    added = true
  }

  const reactionsMap = await loadReactionSummaries([input.messageId], input.clerkUserId)
  const reactions = reactionsMap.get(input.messageId) ?? []

  const payload: ChatReactionUpdatedPayload = {
    message_id: input.messageId,
    channel_id: channelId,
    reactions,
    actor_clerk_id: input.clerkUserId,
  }

  await publishChatEvent(channelId, "reaction", payload as unknown as Record<string, unknown>).catch(
    (error) => console.error("[chat] Ably reaction publish failed:", error),
  )

  if (added && authorClerkId !== input.clerkUserId) {
    await notifyChatReactionPush({
      channelId,
      authorClerkId,
      actorDisplayName: input.actorDisplayName,
      emoji: input.emoji,
    })
  }

  return { ...payload, added }
}
