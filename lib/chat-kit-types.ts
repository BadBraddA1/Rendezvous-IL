/** Transport-agnostic message shape the System Six thread understands. */

import type { ChatMessageKind, ChatReactionSummary } from "@/types/chat"

export type ChatSendStatus = "sending" | "sent" | "failed"

export type ChatAttachment = {
  id: string
  url: string
  kind?: "image" | "file"
  name?: string
}

export type ChatMessage = {
  id: string
  body: string
  createdAt: string | number | Date
  senderId: string
  senderName: string
  senderAvatarUrl?: string | null
  isMine: boolean
  status?: ChatSendStatus
  attachments?: ChatAttachment[]
}

/** Rendezvous year-chat fields layered on kit messages. */
export type ChatKitMessage = ChatMessage & {
  kind?: ChatMessageKind
  isAnnouncement?: boolean
  pollQuestion?: string | null
  pollOptions?: string[] | null
  pollCounts?: number[] | null
  myVote?: number | null
  reactions?: ChatReactionSummary[]
  canDelete?: boolean
}

export type ChatTypingPeer = {
  id: string
  name: string
  avatarUrl?: string | null
}

export type ChatPendingAttachment = {
  id: string
  previewUrl: string
  name?: string
  file?: File
}
