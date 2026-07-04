import type { RegistrationEventYear } from "@/lib/registration-event-years"

export type ChatChannelType = "year" | "custom"

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

export interface ChatMessagePayload {
  id: string
  channel_id: string
  sender_clerk_id: string
  sender_display_name: string
  sender_avatar_url: string | null
  body: string
  image_url: string | null
  is_announcement: boolean
  created_at: string
}
