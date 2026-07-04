"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Loader2, Megaphone, Send, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { chatChannelName } from "@/lib/ably-channels"
import { useAblyChannel } from "@/lib/use-ably-channel"
import type { ChatChannelSummary, ChatMessagePayload } from "@/types/chat"
import { cn } from "@/lib/utils"

async function fetchAblyToken(): Promise<unknown> {
  const response = await fetch("/api/ably/token", { method: "POST" })
  if (!response.ok) {
    throw new Error("Could not connect to chat")
  }
  const data = await response.json()
  return data.tokenRequest
}

type ChatThreadProps = {
  channel: ChatChannelSummary
  currentUserId: string
  isAdmin?: boolean
}

export function ChatThread({ channel, currentUserId, isAdmin = false }: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessagePayload[]>([])
  const [draft, setDraft] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const loadMessages = useCallback(async () => {
    setError(null)
    try {
      const response = await fetch(`/api/chat/channels/${channel.id}/messages?limit=80`)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to load messages")
      }
      const data = await response.json()
      setMessages(data.messages ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages")
    } finally {
      setIsLoading(false)
    }
  }, [channel.id])

  useEffect(() => {
    setIsLoading(true)
    void loadMessages()
  }, [loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const onRealtimeMessage = useCallback((payload: ChatMessagePayload) => {
    setMessages((current) => {
      if (current.some((message) => message.id === payload.id)) return current
      return [...current, payload]
    })
  }, [])

  const realtimeStatus = useAblyChannel({
    getTokenRequest: fetchAblyToken,
    channelName: chatChannelName(channel.id),
    onMessage: (message) => {
      const payload = message.data as ChatMessagePayload
      if (payload?.id) onRealtimeMessage(payload)
    },
  })

  // Poll while Ably is down so the web thread still updates.
  useEffect(() => {
    if (realtimeStatus === "connected") return
    const id = window.setInterval(() => {
      void loadMessages()
    }, 4000)
    return () => window.clearInterval(id)
  }, [realtimeStatus, loadMessages])

  async function sendMessage(isAnnouncement = false) {
    const body = draft.trim()
    if (!body || isSending) return

    setIsSending(true)
    setError(null)
    try {
      const response = await fetch(`/api/chat/channels/${channel.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, is_announcement: isAnnouncement }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to send message")
      }
      const data = await response.json()
      if (data.message) {
        onRealtimeMessage(data.message as ChatMessagePayload)
      }
      setDraft("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setIsSending(false)
    }
  }

  async function deleteMessage(messageId: string) {
    const response = await fetch(`/api/chat/messages/${messageId}`, { method: "DELETE" })
    if (!response.ok) return
    setMessages((current) => current.filter((message) => message.id !== messageId))
  }

  const channelLabel = useMemo(() => {
    if (channel.channel_type === "year" && channel.event_year) {
      return `Rendezvous ${channel.event_year}`
    }
    return channel.name
  }, [channel])

  return (
    <div className="flex h-full min-h-[28rem] flex-col rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{channelLabel}</h2>
          {channel.is_test ? <Badge variant="secondary">Test</Badge> : null}
          {realtimeStatus === "connected" ? (
            <Badge variant="outline" className="text-emerald-700">
              Live
            </Badge>
          ) : realtimeStatus === "connecting" ? (
            <Badge variant="outline">Connecting…</Badge>
          ) : realtimeStatus === "failed" ? (
            <Badge variant="outline" className="text-amber-700">
              Updating every few seconds
            </Badge>
          ) : null}
        </div>
        {channel.description ? (
          <p className="mt-1 text-sm text-muted-foreground">{channel.description}</p>
        ) : null}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No messages yet. Say hello to your Rendezvous family.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.sender_clerk_id === currentUserId
            return (
              <div
                key={message.id}
                className={cn("group flex", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                    message.is_announcement
                      ? "border border-amber-300/60 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50"
                      : mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted",
                  )}
                >
                  <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                    {message.is_announcement ? <Megaphone className="h-3.5 w-3.5" /> : null}
                    <span className="font-medium">{message.sender_display_name}</span>
                    <span>
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                    {(mine || isAdmin) && (
                      <button
                        type="button"
                        className="ml-auto opacity-0 transition group-hover:opacity-100"
                        onClick={() => void deleteMessage(message.id)}
                        aria-label="Delete message"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-4">
        {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Message ${channelLabel}…`}
            rows={2}
            className="min-h-[3rem] resize-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void sendMessage()
              }
            }}
          />
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="icon"
              disabled={!draft.trim() || isSending}
              onClick={() => void sendMessage()}
              aria-label="Send message"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            {isAdmin ? (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                disabled={!draft.trim() || isSending}
                onClick={() => void sendMessage(true)}
                aria-label="Send announcement"
              >
                <Megaphone className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
