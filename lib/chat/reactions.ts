/** Fixed reaction set for chat messages (web + iOS must match). */
export const CHAT_REACTION_EMOJIS = ["🦙", "👍", "❤️", "😂", "🙏"] as const

export type ChatReactionEmoji = (typeof CHAT_REACTION_EMOJIS)[number]

export function isAllowedChatReaction(emoji: string): emoji is ChatReactionEmoji {
  return (CHAT_REACTION_EMOJIS as readonly string[]).includes(emoji)
}

export const MAX_CHAT_PHOTOS_PER_MESSAGE = 6
