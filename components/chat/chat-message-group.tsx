"use client"

import { BarChart3, Megaphone, SmilePlus, Trash2 } from "lucide-react"
import { ChatAvatar } from "@/components/chat/chat-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CHAT_REACTION_EMOJIS } from "@/lib/chat/reactions"
import { chatConfig } from "@/lib/chat-config"
import { formatExactTime, type ChatMessageGroup as Group } from "@/lib/group-messages"
import type { ChatKitMessage } from "@/lib/chat-kit-types"
import { cn } from "@/lib/utils"

export type ChatMessageGroupActions = {
  onVote?: (messageId: string, optionIndex: number) => void
  onToggleReaction?: (messageId: string, emoji: string) => void
  onReactionDetail?: (messageId: string, emoji: string) => void
  onDelete?: (messageId: string) => void
}

type ChatMessageGroupProps = {
  group: Group
  onRetry?: (messageId: string) => void
  actions?: ChatMessageGroupActions
}

function MessageBubble({
  message,
  onRetry,
  actions,
}: {
  message: ChatKitMessage
  onRetry?: (messageId: string) => void
  actions?: ChatMessageGroupActions
}) {
  const totalVotes = message.pollCounts?.reduce((a, b) => a + b, 0) ?? 0
  const isPoll = message.kind === "poll"
  const isAnnouncement = Boolean(message.isAnnouncement)

  return (
    <div>
      <div
        className={cn(
          "bc-chat__bubble",
          isAnnouncement && "bc-chat__bubble--announcement",
          isPoll && "bc-chat__bubble--poll",
        )}
        data-status={message.status ?? "sent"}
        tabIndex={0}
      >
        <span className="bc-chat__time">{formatExactTime(message.createdAt)}</span>

        {isAnnouncement || isPoll ? (
          <div className="bc-chat__bubble-meta">
            {isAnnouncement ? <Megaphone className="bc-chat__meta-icon" aria-hidden /> : null}
            {isPoll ? <BarChart3 className="bc-chat__meta-icon" aria-hidden /> : null}
            {message.canDelete && actions?.onDelete ? (
              <button
                type="button"
                className="bc-chat__delete"
                onClick={() => actions.onDelete!(message.id)}
                aria-label="Delete message"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : message.canDelete && actions?.onDelete ? (
          <button
            type="button"
            className="bc-chat__delete bc-chat__delete--solo"
            onClick={() => actions.onDelete!(message.id)}
            aria-label="Delete message"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}

        {message.attachments && message.attachments.length > 0 ? (
          <div
            className={cn(
              "bc-chat__attachments",
              message.attachments.length > 1 && "bc-chat__attachments--grid",
            )}
          >
            {message.attachments.map((file) =>
              file.kind === "file" ? (
                <a key={file.id} href={file.url} target="_blank" rel="noreferrer">
                  {file.name ?? "Attachment"}
                </a>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={file.id} src={file.url} alt={file.name ?? ""} />
              ),
            )}
          </div>
        ) : null}

        {isPoll && message.pollOptions ? (
          <div className="bc-chat__poll">
            <p className="bc-chat__poll-question">
              {message.pollQuestion || message.body}
            </p>
            <div className="bc-chat__poll-options">
              {message.pollOptions.map((option, index) => {
                const count = message.pollCounts?.[index] ?? 0
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
                const selected = message.myVote === index
                return (
                  <button
                    key={`${message.id}-${index}`}
                    type="button"
                    className={cn("bc-chat__poll-option", selected && "bc-chat__poll-option--selected")}
                    onClick={() => actions?.onVote?.(message.id, index)}
                  >
                    <span
                      className="bc-chat__poll-bar"
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                    <span className="bc-chat__poll-option-row">
                      <span>{option}</span>
                      <span className="bc-chat__poll-count">
                        {count}
                        {totalVotes > 0 ? ` · ${pct}%` : ""}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="bc-chat__poll-total">
              {totalVotes} vote{totalVotes === 1 ? "" : "s"}
            </p>
          </div>
        ) : message.body ? (
          <div className="bc-chat__body">{message.body}</div>
        ) : null}

        {(message.reactions?.length ?? 0) > 0 || actions?.onToggleReaction ? (
          <div className="bc-chat__reactions">
            {(message.reactions ?? []).map((reaction) => (
              <button
                key={`${message.id}-${reaction.emoji}`}
                type="button"
                className={cn(
                  "bc-chat__reaction",
                  reaction.reacted_by_me && "bc-chat__reaction--mine",
                )}
                onClick={() =>
                  actions?.onReactionDetail?.(message.id, String(reaction.emoji))
                }
                aria-label={`${reaction.emoji} ${reaction.count} reactions`}
              >
                <span>{reaction.emoji}</span>
                <span className="tabular-nums">{reaction.count}</span>
              </button>
            ))}
            {actions?.onToggleReaction ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="bc-chat__reaction-add"
                    aria-label="Add reaction"
                  >
                    <SmilePlus className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-0 p-1">
                  <div className="flex gap-0.5">
                    {CHAT_REACTION_EMOJIS.map((emoji) => (
                      <DropdownMenuItem
                        key={emoji}
                        className="cursor-pointer px-2 py-1.5 text-base"
                        onSelect={() => actions.onToggleReaction!(message.id, emoji)}
                      >
                        {emoji}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ) : null}
      </div>

      {message.status === "failed" ? (
        <div className="bc-chat__failed">
          <span>Couldn&apos;t send</span>
          {onRetry ? (
            <button type="button" onClick={() => onRetry(message.id)}>
              {chatConfig.copy.retry}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function ChatMessageGroupView({ group, onRetry, actions }: ChatMessageGroupProps) {
  return (
    <div
      className={["bc-chat__group", group.isMine ? "bc-chat__group--mine" : null]
        .filter(Boolean)
        .join(" ")}
    >
      {group.isMine ? (
        <div className="bc-chat__avatar-spacer" aria-hidden />
      ) : (
        <ChatAvatar name={group.senderName} url={group.senderAvatarUrl} />
      )}

      <div className="bc-chat__stack">
        {!group.isMine ? <div className="bc-chat__name">{group.senderName}</div> : null}

        {group.messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onRetry={onRetry}
            actions={actions}
          />
        ))}
      </div>
    </div>
  )
}
