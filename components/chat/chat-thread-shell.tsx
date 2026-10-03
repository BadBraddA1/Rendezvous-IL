"use client"

import type { ReactNode } from "react"
import { useMemo } from "react"
import { Loader2 } from "lucide-react"
import { ChatComposer } from "@/components/chat/chat-composer"
import {
  ChatMessageGroupView,
  type ChatMessageGroupActions,
} from "@/components/chat/chat-message-group"
import { ChatTypingIndicator } from "@/components/chat/chat-typing-indicator"
import { useChatScroll } from "@/components/chat/use-chat-scroll"
import { chatConfig } from "@/lib/chat-config"
import { groupMessages } from "@/lib/group-messages"
import type { ChatKitMessage, ChatPendingAttachment, ChatTypingPeer } from "@/lib/chat-kit-types"

export type ChatThreadShellProps = {
  messages: ChatKitMessage[]
  typing?: ChatTypingPeer[]
  draft: string
  onDraftChange: (value: string) => void
  onSend: () => void
  onRetry?: (messageId: string) => void
  pendingAttachments?: ChatPendingAttachment[]
  onRemovePending?: (id: string) => void
  onPickFiles?: (files: FileList) => void
  composerDisabled?: boolean
  composerTop?: ReactNode
  loading?: boolean
  messageActions?: ChatMessageGroupActions
  className?: string
}

/** System Six presentation shell — wire transport in `chat-thread.tsx`. */
export function ChatThreadShell({
  messages,
  typing = [],
  draft,
  onDraftChange,
  onSend,
  onRetry,
  pendingAttachments,
  onRemovePending,
  onPickFiles,
  composerDisabled,
  composerTop,
  loading = false,
  messageActions,
  className,
}: ChatThreadShellProps) {
  const days = useMemo(() => groupMessages(messages), [messages])
  const itemCount = messages.length + typing.length
  const { scrollerRef, bottomRef, unseenCount, onScroll, scrollToBottom } =
    useChatScroll(itemCount)

  return (
    <div className={["bc-chat", className].filter(Boolean).join(" ")}>
      <div className="bc-chat__viewport">
        <div ref={scrollerRef} className="bc-chat__scroller" onScroll={onScroll}>
          {loading ? (
            <div className="bc-chat__loading">
              <Loader2 className="bc-chat__loading-icon" aria-hidden />
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <div className="bc-chat__empty">
              <h2>{chatConfig.copy.emptyTitle}</h2>
              <p>{chatConfig.copy.emptySubtitle}</p>
            </div>
          ) : (
            days.map((day) => (
              <section key={day.dayKey}>
                <div className="bc-chat__day">
                  <span>{day.label}</span>
                </div>
                {day.groups.map((group) => (
                  <ChatMessageGroupView
                    key={group.id}
                    group={group}
                    onRetry={onRetry}
                    actions={messageActions}
                  />
                ))}
              </section>
            ))
          )}

          <ChatTypingIndicator peers={typing} />
          <div ref={bottomRef} />
        </div>

        {unseenCount > 0 ? (
          <button
            type="button"
            className="bc-chat__pill"
            onClick={() => scrollToBottom("smooth")}
          >
            {chatConfig.copy.newMessages(unseenCount)}
          </button>
        ) : null}
      </div>

      {composerTop}
      <ChatComposer
        value={draft}
        onChange={onDraftChange}
        onSend={onSend}
        pending={pendingAttachments}
        onRemovePending={onRemovePending}
        onPickFiles={onPickFiles}
        disabled={composerDisabled}
      />
    </div>
  )
}
