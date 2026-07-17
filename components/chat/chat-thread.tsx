"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { normalizeChatTimestamp } from "@/lib/chat/timestamps"
import {
  BarChart3,
  ImagePlus,
  Loader2,
  Megaphone,
  Send,
  SmilePlus,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { chatChannelName } from "@/lib/ably-channels"
import { CHAT_REACTION_EMOJIS, MAX_CHAT_PHOTOS_PER_MESSAGE } from "@/lib/chat/reactions"
import { useAblyChannel } from "@/lib/use-ably-channel"
import type {
  ChatChannelSummary,
  ChatMessageDeletedPayload,
  ChatMessagePayload,
  ChatPollUpdatedPayload,
  ChatReactionSummary,
  ChatReactionUpdatedPayload,
} from "@/types/chat"
import { cn } from "@/lib/utils"

async function fetchAblyToken(): Promise<unknown> {
  const response = await fetch("/api/ably/token", { method: "POST" })
  if (!response.ok) {
    throw new Error("Could not connect to chat")
  }
  const data = await response.json()
  return data.tokenRequest
}

type PendingPhoto = { id: string; file: File; previewUrl: string }

type ChatThreadProps = {
  channel: ChatChannelSummary
  currentUserId: string
  isAdmin?: boolean
  canModerate?: boolean
}

function normalizeMessage(raw: ChatMessagePayload): ChatMessagePayload {
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
    reactions: Array.isArray(raw.reactions) ? raw.reactions : [],
  }
}

export function ChatThread({
  channel,
  currentUserId,
  isAdmin = false,
  canModerate = false,
}: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessagePayload[]>([])
  const [draft, setDraft] = useState("")
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [threadCanModerate, setThreadCanModerate] = useState(canModerate || isAdmin)
  const [pollOpen, setPollOpen] = useState(false)
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollOptions, setPollOptions] = useState(["", ""])
  const [isCreatingPoll, setIsCreatingPoll] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const loadMessages = useCallback(async () => {
    setError(null)
    try {
      const response = await fetch(`/api/chat/channels/${channel.id}/messages?limit=80`)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to load messages")
      }
      const data = await response.json()
      setMessages((data.messages ?? []).map((m: ChatMessagePayload) => normalizeMessage(m)))
      if (typeof data.can_moderate === "boolean") {
        setThreadCanModerate(data.can_moderate || isAdmin)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages")
    } finally {
      setIsLoading(false)
    }
  }, [channel.id, isAdmin])

  useEffect(() => {
    setIsLoading(true)
    setThreadCanModerate(canModerate || isAdmin || Boolean(channel.can_moderate))
    void loadMessages()
  }, [loadMessages, canModerate, isAdmin, channel.can_moderate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    return () => {
      for (const photo of pendingPhotos) URL.revokeObjectURL(photo.previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
  }, [])

  const upsertMessage = useCallback((payload: ChatMessagePayload) => {
    const normalized = normalizeMessage(payload)
    setMessages((current) => {
      if (current.some((message) => message.id === normalized.id)) {
        return current.map((m) => (m.id === normalized.id ? { ...m, ...normalized } : m))
      }
      return [...current, normalized]
    })
  }, [])

  const ablyEvents = useMemo(
    () => ["message", "message_deleted", "reaction", "poll_updated"],
    [],
  )

  const realtimeStatus = useAblyChannel({
    getTokenRequest: fetchAblyToken,
    channelName: chatChannelName(channel.id),
    event: ablyEvents,
    onMessage: (message) => {
      if (message.name === "message_deleted") {
        const payload = message.data as ChatMessageDeletedPayload
        if (payload?.id) {
          setMessages((current) => current.filter((m) => m.id !== payload.id))
        }
        return
      }
      if (message.name === "reaction") {
        const payload = message.data as ChatReactionUpdatedPayload
        if (!payload?.message_id) return
        setMessages((current) =>
          current.map((m) => {
            if (m.id !== payload.message_id) return m
            // Recompute reacted_by_me for this viewer from actor + previous state
            const reactions = (payload.reactions ?? []).map((r) => {
              if (payload.actor_clerk_id === currentUserId) {
                return r
              }
              const prev = m.reactions.find((p) => p.emoji === r.emoji)
              return {
                ...r,
                reacted_by_me: prev?.reacted_by_me ?? false,
              }
            })
            return { ...m, reactions }
          }),
        )
        return
      }
      if (message.name === "poll_updated") {
        const payload = message.data as ChatPollUpdatedPayload
        if (!payload?.message_id || !Array.isArray(payload.poll_counts)) return
        setMessages((current) =>
          current.map((m) => {
            if (m.id !== payload.message_id) return m
            const myVote =
              payload.voter_clerk_id === currentUserId && typeof payload.my_vote === "number"
                ? payload.my_vote
                : payload.voter_clerk_id === currentUserId
                  ? m.my_vote
                  : m.my_vote
            return {
              ...m,
              poll_counts: payload.poll_counts,
              my_vote:
                payload.voter_clerk_id === currentUserId
                  ? typeof payload.my_vote === "number"
                    ? payload.my_vote
                    : myVote
                  : m.my_vote,
            }
          }),
        )
        return
      }
      const payload = message.data as ChatMessagePayload
      if (payload?.id) upsertMessage(payload)
    },
  })

  useEffect(() => {
    if (realtimeStatus === "connected") return
    const id = window.setInterval(() => {
      void loadMessages()
    }, 4000)
    return () => window.clearInterval(id)
  }, [realtimeStatus, loadMessages])

  function clearPhotos() {
    setPendingPhotos((current) => {
      for (const photo of current) URL.revokeObjectURL(photo.previewUrl)
      return []
    })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function onPickPhotos(fileList: FileList | null) {
    if (!fileList?.length) return
    setPendingPhotos((current) => {
      const room = MAX_CHAT_PHOTOS_PER_MESSAGE - current.length
      if (room <= 0) return current
      const next = [...current]
      for (const file of Array.from(fileList).slice(0, room)) {
        if (!file.type.startsWith("image/")) continue
        next.push({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
          file,
          previewUrl: URL.createObjectURL(file),
        })
      }
      return next
    })
  }

  function removePendingPhoto(id: string) {
    setPendingPhotos((current) => {
      const target = current.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return current.filter((p) => p.id !== id)
    })
  }

  async function sendMessage(isAnnouncement = false) {
    const body = draft.trim()
    if ((!body && pendingPhotos.length === 0) || isSending) return

    setIsSending(true)
    setError(null)
    try {
      let response: Response
      if (pendingPhotos.length > 0) {
        const form = new FormData()
        form.set("body", body)
        form.set("is_announcement", isAnnouncement ? "true" : "false")
        for (const photo of pendingPhotos) {
          form.append("photo", photo.file)
        }
        response = await fetch(`/api/chat/channels/${channel.id}/messages`, {
          method: "POST",
          body: form,
        })
      } else {
        response = await fetch(`/api/chat/channels/${channel.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body, is_announcement: isAnnouncement }),
        })
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to send message")
      }
      const data = await response.json()
      if (data.message) upsertMessage(data.message as ChatMessagePayload)
      setDraft("")
      clearPhotos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setIsSending(false)
    }
  }

  async function createPoll() {
    const question = pollQuestion.trim()
    const options = pollOptions.map((o) => o.trim()).filter(Boolean)
    if (!question || options.length < 2 || isCreatingPoll) return
    setIsCreatingPoll(true)
    setError(null)
    try {
      const response = await fetch(`/api/chat/channels/${channel.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "poll",
          poll_question: question,
          poll_options: options,
          body: question,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to create poll")
      }
      const data = await response.json()
      if (data.message) upsertMessage(data.message as ChatMessagePayload)
      setPollOpen(false)
      setPollQuestion("")
      setPollOptions(["", ""])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create poll")
    } finally {
      setIsCreatingPoll(false)
    }
  }

  async function deleteMessage(messageId: string) {
    const response = await fetch(`/api/chat/messages/${messageId}`, { method: "DELETE" })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error || "Failed to delete message")
      return
    }
    setMessages((current) => current.filter((message) => message.id !== messageId))
  }

  async function vote(messageId: string, optionIndex: number) {
    setMessages((current) =>
      current.map((m) => {
        if (m.id !== messageId || !m.poll_options || !m.poll_counts) return m
        const counts = [...m.poll_counts]
        if (typeof m.my_vote === "number" && counts[m.my_vote] != null) {
          counts[m.my_vote] = Math.max(0, counts[m.my_vote] - 1)
        }
        counts[optionIndex] = (counts[optionIndex] ?? 0) + 1
        return { ...m, my_vote: optionIndex, poll_counts: counts }
      }),
    )
    const response = await fetch(`/api/chat/messages/${messageId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ option_index: optionIndex }),
    })
    if (!response.ok) {
      void loadMessages()
      return
    }
    const data = await response.json()
    if (data.poll?.poll_counts) {
      setMessages((current) =>
        current.map((m) =>
          m.id === messageId
            ? {
                ...m,
                poll_counts: data.poll.poll_counts,
                my_vote: data.poll.my_vote ?? optionIndex,
              }
            : m,
        ),
      )
    }
  }

  async function toggleReaction(messageId: string, emoji: string) {
    setMessages((current) =>
      current.map((m) => {
        if (m.id !== messageId) return m
        const existing = m.reactions.find((r) => r.emoji === emoji)
        let reactions: ChatReactionSummary[]
        if (existing?.reacted_by_me) {
          reactions = m.reactions
            .map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count - 1, reacted_by_me: false }
                : r,
            )
            .filter((r) => r.count > 0)
        } else if (existing) {
          reactions = m.reactions.map((r) =>
            r.emoji === emoji ? { ...r, count: r.count + 1, reacted_by_me: true } : r,
          )
        } else {
          reactions = [...m.reactions, { emoji, count: 1, reacted_by_me: true }]
        }
        return { ...m, reactions }
      }),
    )

    const response = await fetch(`/api/chat/messages/${messageId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    })
    if (!response.ok) {
      void loadMessages()
      return
    }
    const data = await response.json()
    if (data.reaction?.reactions) {
      setMessages((current) =>
        current.map((m) =>
          m.id === messageId ? { ...m, reactions: data.reaction.reactions } : m,
        ),
      )
    }
  }

  const channelLabel = useMemo(() => {
    if (channel.channel_type === "year" && channel.event_year) {
      return `Rendezvous ${channel.event_year}`
    }
    return channel.name
  }, [channel])

  const canSend = Boolean(draft.trim() || pendingPhotos.length > 0)

  return (
    <div className="flex h-full min-h-[28rem] flex-col rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{channelLabel}</h2>
          {channel.is_test ? <Badge variant="secondary">Test</Badge> : null}
          {threadCanModerate ? <Badge variant="outline">Moderator</Badge> : null}
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
            const canDelete = mine || threadCanModerate
            const totalVotes = message.poll_counts?.reduce((a, b) => a + b, 0) ?? 0
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
                      : message.kind === "poll"
                        ? "border border-primary/30 bg-muted"
                        : mine
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted",
                  )}
                >
                  <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                    {message.is_announcement ? <Megaphone className="h-3.5 w-3.5" /> : null}
                    {message.kind === "poll" ? <BarChart3 className="h-3.5 w-3.5" /> : null}
                    <span className="font-medium">{message.sender_display_name}</span>
                    <span>
                      {formatDistanceToNow(new Date(normalizeChatTimestamp(message.created_at)), {
                        addSuffix: true,
                      })}
                    </span>
                    {canDelete ? (
                      <button
                        type="button"
                        className="ml-auto opacity-0 transition group-hover:opacity-100"
                        onClick={() => void deleteMessage(message.id)}
                        aria-label="Delete message"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>

                  {message.image_urls.length > 0 ? (
                    <div
                      className={cn(
                        "mb-2 grid gap-1",
                        message.image_urls.length === 1 ? "grid-cols-1" : "grid-cols-2",
                      )}
                    >
                      {message.image_urls.map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt=""
                          className="max-h-72 w-full rounded-xl object-cover"
                        />
                      ))}
                    </div>
                  ) : null}

                  {message.kind === "poll" && message.poll_options ? (
                    <div className="space-y-2">
                      <p className="font-medium whitespace-pre-wrap break-words">
                        {message.poll_question || message.body}
                      </p>
                      <div className="space-y-1.5">
                        {message.poll_options.map((option, index) => {
                          const count = message.poll_counts?.[index] ?? 0
                          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
                          const selected = message.my_vote === index
                          return (
                            <button
                              key={`${message.id}-${index}`}
                              type="button"
                              className={cn(
                                "relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition",
                                selected
                                  ? "border-primary bg-primary/10"
                                  : "border-border/70 bg-background/60 hover:border-primary/40",
                              )}
                              onClick={() => void vote(message.id, index)}
                            >
                              <span
                                className="absolute inset-y-0 left-0 bg-primary/15"
                                style={{ width: `${pct}%` }}
                              />
                              <span className="relative flex items-center justify-between gap-2">
                                <span>{option}</span>
                                <span className="tabular-nums text-xs opacity-70">
                                  {count}
                                  {totalVotes > 0 ? ` · ${pct}%` : ""}
                                </span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      <p className="text-xs opacity-70">
                        {totalVotes} vote{totalVotes === 1 ? "" : "s"}
                      </p>
                    </div>
                  ) : message.body ? (
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {message.reactions.length > 0
                      ? message.reactions.map((reaction) => (
                          <button
                            key={`${message.id}-${reaction.emoji}`}
                            type="button"
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                              reaction.reacted_by_me
                                ? "border-primary/50 bg-primary/15"
                                : "border-border/60 bg-background/50",
                            )}
                            onClick={() => void toggleReaction(message.id, reaction.emoji)}
                          >
                            <span>{reaction.emoji}</span>
                            <span className="tabular-nums">{reaction.count}</span>
                          </button>
                        ))
                      : null}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/70 transition hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
                          aria-label="Add reaction"
                        >
                          <SmilePlus className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={mine ? "end" : "start"} className="min-w-0 p-1">
                        <div className="flex gap-0.5">
                          {CHAT_REACTION_EMOJIS.map((emoji) => (
                            <DropdownMenuItem
                              key={emoji}
                              className="cursor-pointer px-2 py-1.5 text-base"
                              onSelect={() => void toggleReaction(message.id, emoji)}
                            >
                              {emoji}
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-4">
        {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
        {pendingPhotos.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {pendingPhotos.map((photo) => (
              <div key={photo.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.previewUrl}
                  alt="Selected"
                  className="h-24 w-24 rounded-lg border object-cover"
                />
                <button
                  type="button"
                  className="absolute -right-2 -top-2 rounded-full bg-background p-1 shadow"
                  onClick={() => removePendingPhoto(photo.id)}
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(event) => {
              onPickPhotos(event.target.files)
              if (fileInputRef.current) fileInputRef.current.value = ""
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={isSending || pendingPhotos.length >= MAX_CHAT_PHOTOS_PER_MESSAGE}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach photos"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
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
              disabled={!canSend || isSending}
              onClick={() => void sendMessage()}
              aria-label="Send message"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            {threadCanModerate ? (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  disabled={!canSend || isSending}
                  onClick={() => void sendMessage(true)}
                  aria-label="Send announcement"
                >
                  <Megaphone className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={isSending}
                  onClick={() => setPollOpen(true)}
                  aria-label="Create poll"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={pollOpen} onOpenChange={setPollOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a poll</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="Ask a question…"
              maxLength={280}
            />
            {pollOptions.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={option}
                  onChange={(e) =>
                    setPollOptions((current) =>
                      current.map((o, i) => (i === index ? e.target.value : o)),
                    )
                  }
                  placeholder={`Option ${index + 1}`}
                  maxLength={120}
                />
                {pollOptions.length > 2 ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setPollOptions((current) => current.filter((_, i) => i !== index))
                    }
                    aria-label="Remove option"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            {pollOptions.length < 6 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPollOptions((current) => [...current, ""])}
              >
                Add option
              </Button>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setPollOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                isCreatingPoll ||
                !pollQuestion.trim() ||
                pollOptions.map((o) => o.trim()).filter(Boolean).length < 2
              }
              onClick={() => void createPoll()}
            >
              {isCreatingPoll ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post poll"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
