import { normalizeChatTimestamp } from "@/lib/chat/timestamps"
import type { ChatKitMessage } from "@/lib/chat-kit-types"
import type { ChatMessagePayload } from "@/types/chat"

export function normalizeMessagePayload(raw: ChatMessagePayload): ChatMessagePayload {
  const imageUrls =
    Array.isArray(raw.image_urls) && raw.image_urls.length > 0
      ? raw.image_urls
      : raw.image_url
        ? [raw.image_url]
        : []
  return {
    ...raw,
    image_urls: imageUrls,
    image_url: imageUrls[0] ?? null,
    kind: raw.kind === "poll" ? "poll" : "text",
    poll_question: raw.poll_question ?? null,
    poll_options: raw.poll_options ?? null,
    poll_counts: raw.poll_counts ?? null,
    my_vote: raw.my_vote ?? null,
    reactions: Array.isArray(raw.reactions)
      ? raw.reactions.map((r) => ({
          ...r,
          reactors: Array.isArray(r.reactors) ? r.reactors : [],
        }))
      : [],
  }
}

export function payloadToKitMessage(
  raw: ChatMessagePayload,
  currentUserId: string,
  options?: { canDelete?: boolean; status?: ChatKitMessage["status"] },
): ChatKitMessage {
  const message = normalizeMessagePayload(raw)
  const mine = message.sender_clerk_id === currentUserId
  return {
    id: message.id,
    body: message.body,
    createdAt: normalizeChatTimestamp(message.created_at),
    senderId: message.sender_clerk_id,
    senderName: message.sender_display_name,
    senderAvatarUrl: message.sender_avatar_url,
    isMine: mine,
    status: options?.status ?? "sent",
    attachments: message.image_urls.map((url, index) => ({
      id: `${message.id}-img-${index}`,
      url,
      kind: "image" as const,
    })),
    kind: message.kind,
    isAnnouncement: message.is_announcement,
    pollQuestion: message.poll_question,
    pollOptions: message.poll_options,
    pollCounts: message.poll_counts,
    myVote: message.my_vote,
    reactions: message.reactions,
    canDelete: options?.canDelete ?? false,
  }
}
