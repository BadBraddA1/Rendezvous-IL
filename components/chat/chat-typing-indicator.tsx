"use client"

import { ChatAvatar } from "@/components/chat/chat-avatar"
import type { ChatTypingPeer } from "@/lib/chat-kit-types"

/** System Six decision 5: lives in the flow where the next message lands. */
export function ChatTypingIndicator({ peers }: { peers: ChatTypingPeer[] }) {
  if (peers.length === 0) return null
  const peer = peers[0]!

  return (
    <div className="bc-chat__typing" aria-live="polite" aria-label={`${peer.name} is typing`}>
      <ChatAvatar name={peer.name} url={peer.avatarUrl} />
      <div className="bc-chat__dots">
        <i />
        <i />
        <i />
      </div>
    </div>
  )
}
