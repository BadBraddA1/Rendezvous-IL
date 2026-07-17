import { sql } from "@/lib/db"
import { publishChatEvent } from "@/lib/ably"
import { userCanAccessChannel } from "@/lib/chat/channels"
import { loadMyVotes, loadPollCounts } from "@/lib/chat/message-enrichment"
import { ensureChatSchema } from "@/lib/chat-schema"
import type { ChatPollUpdatedPayload } from "@/types/chat"

export async function voteOnPoll(input: {
  messageId: string
  optionIndex: number
  clerkUserId: string
  email?: string
  isAdmin: boolean
}): Promise<ChatPollUpdatedPayload> {
  await ensureChatSchema()

  const [row] = await sql`
    SELECT id, channel_id, kind, poll_options, deleted_at
    FROM chat_messages
    WHERE id = ${input.messageId}
    LIMIT 1
  `
  if (!row || row.deleted_at != null) throw new Error("Poll not found")
  if (String(row.kind) !== "poll") throw new Error("Message is not a poll")

  const channelId = String(row.channel_id)
  const canAccess = await userCanAccessChannel(
    channelId,
    input.clerkUserId,
    input.email,
    input.isAdmin,
  )
  if (!canAccess) throw new Error("Forbidden")

  let options: string[] = []
  try {
    const parsed = JSON.parse(String(row.poll_options || "[]")) as unknown
    if (Array.isArray(parsed)) options = parsed.filter((o): o is string => typeof o === "string")
  } catch {
    throw new Error("Invalid poll")
  }
  if (options.length < 2) throw new Error("Invalid poll")
  if (
    !Number.isInteger(input.optionIndex) ||
    input.optionIndex < 0 ||
    input.optionIndex >= options.length
  ) {
    throw new Error("Invalid poll option")
  }

  await sql`
    INSERT INTO chat_poll_votes (message_id, clerk_user_id, option_index)
    VALUES (${input.messageId}, ${input.clerkUserId}, ${input.optionIndex})
    ON CONFLICT (message_id, clerk_user_id) DO UPDATE SET
      option_index = excluded.option_index,
      created_at = CURRENT_TIMESTAMP
  `

  const countsMap = await loadPollCounts([input.messageId])
  const raw = countsMap.get(input.messageId) ?? []
  const poll_counts = options.map((_, i) => raw[i] ?? 0)
  const myVotes = await loadMyVotes([input.messageId], input.clerkUserId)

  const payload: ChatPollUpdatedPayload = {
    message_id: input.messageId,
    channel_id: channelId,
    poll_counts,
    my_vote: myVotes.get(input.messageId) ?? input.optionIndex,
    voter_clerk_id: input.clerkUserId,
  }

  await publishChatEvent(channelId, "poll_updated", {
    ...payload,
    // Don't leak other users' my_vote over the wire; clients apply locally.
    my_vote: undefined,
  } as unknown as Record<string, unknown>).catch((error) =>
    console.error("[chat] Ably poll_updated publish failed:", error),
  )

  return payload
}
