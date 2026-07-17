import type { RegistrationEventYear } from "@/lib/registration-event-years"
import type { ChatReactionEmoji } from "@/lib/chat/reactions"

export type ChatChannelType = "year" | "custom"

export type ChatMessageKind = "text" | "poll"

export interface ChatChannelRow {
  id: string
  name: string
  channel_type: ChatChannelType
  event_year: number | null
  description: string | null
  is_active: number
  is_test: number
  created_by_clerk_id: string | null
  created_at: string
  updated_at: string
}

export interface ChatChannelSummary {
  id: string
  name: string
  channel_type: ChatChannelType
  event_year: RegistrationEventYear | null
  description: string | null
  is_active: boolean
  is_test: boolean
  last_message_preview: string | null
  last_message_at: string | null
  member_count?: number
  /** Current user can moderate this channel (site admin or channel mod). */
  can_moderate?: boolean
}

export interface ChatReactionSummary {
  emoji: ChatReactionEmoji | string
  count: number
  reacted_by_me: boolean
}

export interface ChatMessagePayload {
  id: string
  channel_id: string
  sender_clerk_id: string
  sender_display_name: string
  sender_avatar_url: string | null
  body: string
  image_url: string | null
  image_urls: string[]
  kind: ChatMessageKind
  is_announcement: boolean
  poll_question: string | null
  poll_options: string[] | null
  poll_counts: number[] | null
  my_vote: number | null
  reactions: ChatReactionSummary[]
  created_at: string
}

export interface ChatPollUpdatedPayload {
  message_id: string
  channel_id: string
  poll_counts: number[]
  my_vote?: number | null
  voter_clerk_id?: string
}

export interface ChatReactionUpdatedPayload {
  message_id: string
  channel_id: string
  reactions: ChatReactionSummary[]
  actor_clerk_id: string
}

export interface ChatMessageDeletedPayload {
  id: string
  channel_id: string
}
