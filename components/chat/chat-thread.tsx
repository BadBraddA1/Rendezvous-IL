"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BarChart3, Megaphone } from "lucide-react"
import { ChatThreadShell } from "@/components/chat/chat-thread-shell"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { chatChannelName } from "@/lib/ably-channels"
import { compressChatPhotoForUpload } from "@/lib/chat/compress-photo-client"
import { MAX_CHAT_PHOTOS_PER_MESSAGE } from "@/lib/chat/reactions"
import { normalizeMessagePayload, payloadToKitMessage } from "@/lib/chat/to-kit-message"
import type { ChatSendStatus, ChatPendingAttachment } from "@/lib/chat-kit-types"
import { useAblyChannel } from "@/lib/use-ably-channel"
import { useChatTyping } from "@/lib/use-chat-typing"
import type {
  ChatChannelSummary,
  ChatMessageDeletedPayload,
  ChatMessagePayload,
  ChatPollUpdatedPayload,
  ChatReactionSummary,
  ChatReactionUpdatedPayload,
} from "@/types/chat"

async function fetchAblyToken(): Promise<unknown> {
  const response = await fetch("/api/ably/token", { method: "POST" })
  if (!response.ok) {
    throw new Error("Could not connect to chat")
  }
  const data = await response.json()
  return data.tokenRequest
}

type PendingPhoto = { id: string; file: File; previewUrl: string }

type FailedSend = {
  body: string
  photos: PendingPhoto[]
  isAnnouncement: boolean
}

type ChatThreadProps = {
  channel: ChatChannelSummary
  currentUserId: string
  isAdmin?: boolean
  canModerate?: boolean
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
  const [sendStatusById, setSendStatusById] = useState<Record<string, ChatSendStatus>>({})
  const [error, setError] = useState<string | null>(null)
  const [threadCanModerate, setThreadCanModerate] = useState(canModerate || isAdmin)
  const [pollOpen, setPollOpen] = useState(false)
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollOptions, setPollOptions] = useState(["", ""])
  const [isCreatingPoll, setIsCreatingPoll] = useState(false)
  const [reactionDetail, setReactionDetail] = useState<{
    messageId: string
    emoji: string
  } | null>(null)
  const failedSendsRef = useRef<Map<string, FailedSend>>(new Map())
  const [isSending, setIsSending] = useState(false)

  const loadMessages = useCallback(async () => {
    setError(null)
    try {
      const response = await fetch(`/api/chat/channels/${channel.id}/messages?limit=80`)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to load messages")
      }
      const data = await response.json()
      setMessages((data.messages ?? []).map((m: ChatMessagePayload) => normalizeMessagePayload(m)))
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
    return () => {
      for (const photo of pendingPhotos) URL.revokeObjectURL(photo.previewUrl)
      for (const send of failedSendsRef.current.values()) {
        for (const photo of send.photos) URL.revokeObjectURL(photo.previewUrl)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount cleanup
  }, [])

  const upsertMessage = useCallback((payload: ChatMessagePayload) => {
    const normalized = normalizeMessagePayload(payload)
    setMessages((current) => {
      if (current.some((message) => message.id === normalized.id)) {
        return current.map((m) => (m.id === normalized.id ? { ...m, ...normalized } : m))
      }
      return [...current, normalized]
    })
    setSendStatusById((current) => {
      if (!(normalized.id in current)) return current
      const next = { ...current }
      delete next[normalized.id]
      return next
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
      if (payload?.id) {
        if (payload.sender_clerk_id === currentUserId) {
          setMessages((current) => {
            const withoutLocal = current.filter(
              (m) => !(m.id.startsWith("local_") && m.sender_clerk_id === currentUserId),
            )
            const normalized = normalizeMessagePayload(payload)
            if (withoutLocal.some((m) => m.id === normalized.id)) {
              return withoutLocal.map((m) =>
                m.id === normalized.id ? { ...m, ...normalized } : m,
              )
            }
            return [...withoutLocal, normalized]
          })
          setSendStatusById((current) => {
            const next = { ...current }
            for (const key of Object.keys(next)) {
              if (key.startsWith("local_")) delete next[key]
            }
            return next
          })
          return
        }
        upsertMessage(payload)
      }
    },
  })

  useEffect(() => {
    if (realtimeStatus === "connected") return
    const id = window.setInterval(() => {
      void loadMessages()
    }, 4000)
    return () => window.clearInterval(id)
  }, [realtimeStatus, loadMessages])

  const channelLabel = useMemo(() => {
    if (channel.channel_type === "year" && channel.event_year) {
      return `Rendezvous ${channel.event_year}`
    }
    return channel.name
  }, [channel])

  const typingPeers = useChatTyping({
    channelName: chatChannelName(channel.id),
    currentUserId,
    displayName: "You",
    draft,
    enabled: realtimeStatus === "connected",
  })

  const kitMessages = useMemo(
    () =>
      messages.map((message) =>
        payloadToKitMessage(message, currentUserId, {
          canDelete: message.sender_clerk_id === currentUserId || threadCanModerate,
          status:
            sendStatusById[message.id] ??
            (message.id.startsWith("local_") ? "sending" : "sent"),
        }),
      ),
    [messages, currentUserId, threadCanModerate, sendStatusById],
  )

  const pendingAttachments: ChatPendingAttachment[] = useMemo(
    () =>
      pendingPhotos.map((photo) => ({
        id: photo.id,
        previewUrl: photo.previewUrl,
        name: photo.file.name,
        file: photo.file,
      })),
    [pendingPhotos],
  )

  function clearPhotos() {
    setPendingPhotos((current) => {
      for (const photo of current) URL.revokeObjectURL(photo.previewUrl)
      return []
    })
  }

  function onPickPhotos(fileList: FileList) {
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

  async function deliverSend(
    optimisticId: string,
    input: FailedSend,
    options?: { replaceOptimistic?: boolean },
  ) {
    setSendStatusById((current) => ({ ...current, [optimisticId]: "sending" }))
    setError(null)
    try {
      let imageUrls: string[] = []
      if (input.photos.length > 0) {
        for (const photo of input.photos) {
          const compressed = await compressChatPhotoForUpload(photo.file)
          const form = new FormData()
          form.set(
            "photo",
            compressed instanceof File
              ? compressed
              : new File([compressed], photo.file.name.replace(/\.\w+$/, ".jpg") || "chat-photo.jpg", {
                  type: "image/jpeg",
                }),
          )
          const uploadRes = await fetch(`/api/chat/channels/${channel.id}/photos`, {
            method: "POST",
            body: form,
          })
          const data = (await uploadRes.json().catch(() => ({}))) as {
            url?: string
            error?: string
          }
          if (!uploadRes.ok || !data.url) {
            throw new Error(
              typeof data.error === "string" ? data.error : "Could not upload photo",
            )
          }
          imageUrls.push(data.url)
        }
      }

      const response = await fetch(`/api/chat/channels/${channel.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: input.body,
          is_announcement: input.isAnnouncement,
          ...(imageUrls.length > 0 ? { image_urls: imageUrls } : {}),
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to send message")
      }
      const data = await response.json()
      failedSendsRef.current.delete(optimisticId)
      if (data.message) {
        const saved = normalizeMessagePayload(data.message as ChatMessagePayload)
        setMessages((current) => {
          if (options?.replaceOptimistic) {
            return current
              .filter((m) => m.id !== optimisticId)
              .concat(saved)
              .sort(
                (a, b) =>
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
              )
          }
          return current.some((m) => m.id === saved.id)
            ? current.map((m) => (m.id === saved.id ? saved : m))
            : [...current, saved]
        })
        setSendStatusById((current) => {
          const next = { ...current }
          delete next[optimisticId]
          return next
        })
      }
    } catch (err) {
      failedSendsRef.current.set(optimisticId, input)
      setSendStatusById((current) => ({ ...current, [optimisticId]: "failed" }))
      setError(err instanceof Error ? err.message : "Failed to send message")
    }
  }

  async function sendMessage(isAnnouncement = false) {
    const body = draft.trim()
    if ((!body && pendingPhotos.length === 0) || isSending) return

    const optimisticId = `local_${crypto.randomUUID()}`
    const photosSnapshot = [...pendingPhotos]
    const previewUrls = photosSnapshot.map((p) => p.previewUrl)

    const optimistic: ChatMessagePayload = {
      id: optimisticId,
      channel_id: channel.id,
      sender_clerk_id: currentUserId,
      sender_display_name: "You",
      sender_avatar_url: null,
      body,
      image_url: previewUrls[0] ?? null,
      image_urls: previewUrls,
      kind: "text",
      is_announcement: isAnnouncement,
      poll_question: null,
      poll_options: null,
      poll_counts: null,
      my_vote: null,
      reactions: [],
      created_at: new Date().toISOString(),
    }

    failedSendsRef.current.set(optimisticId, {
      body,
      photos: photosSnapshot,
      isAnnouncement,
    })

    setMessages((current) => [...current, optimistic])
    setSendStatusById((current) => ({ ...current, [optimisticId]: "sending" }))
    setDraft("")
    setPendingPhotos([])

    setIsSending(true)
    try {
      await deliverSend(optimisticId, {
        body,
        photos: photosSnapshot,
        isAnnouncement,
      }, { replaceOptimistic: true })
    } finally {
      setIsSending(false)
    }
  }

  function retrySend(messageId: string) {
    const saved = failedSendsRef.current.get(messageId)
    if (!saved) return
    void deliverSend(messageId, saved, { replaceOptimistic: true })
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
    failedSendsRef.current.delete(messageId)
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
              r.emoji === emoji ? { ...r, count: r.count - 1, reacted_by_me: false } : r,
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

  const selectedReaction = useMemo(() => {
    if (!reactionDetail) return null
    const message = messages.find((m) => m.id === reactionDetail.messageId)
    const summary = message?.reactions.find((r) => r.emoji === reactionDetail.emoji)
    if (!message || !summary) return null
    return { message, summary }
  }, [messages, reactionDetail])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border">
      <div className="bc-chat__header">
        <h2 className="bc-chat__header-title">{channelLabel}</h2>
        <div className="bc-chat__header-meta">
          {channel.is_test ? <span className="bc-chat__badge">Test</span> : null}
          {threadCanModerate ? <span className="bc-chat__badge">Moderator</span> : null}
          {realtimeStatus === "connected" ? (
            <span className="bc-chat__badge bc-chat__badge--live">Live</span>
          ) : realtimeStatus === "connecting" ? (
            <span className="bc-chat__badge">Connecting…</span>
          ) : realtimeStatus === "failed" ? (
            <span className="bc-chat__badge">Updating every few seconds</span>
          ) : null}
        </div>
        {channel.description ? <p className="mt-2 text-sm text-muted-foreground">{channel.description}</p> : null}
      </div>

      <div className="min-h-0 flex-1">
        <ChatThreadShell
          className="h-full"
          messages={kitMessages}
          typing={typingPeers}
          draft={draft}
          onDraftChange={setDraft}
          onSend={() => void sendMessage()}
          onRetry={retrySend}
          pendingAttachments={pendingAttachments}
          onRemovePending={removePendingPhoto}
          onPickFiles={onPickFiles}
          loading={isLoading}
          messageActions={{
            onVote: (id, index) => void vote(id, index),
            onToggleReaction: (id, emoji) => void toggleReaction(id, emoji),
            onReactionDetail: (messageId, emoji) => setReactionDetail({ messageId, emoji }),
            onDelete: (id) => void deleteMessage(id),
          }}
          composerTop={
            <>
              {error ? <p className="bc-chat__error">{error}</p> : null}
              {threadCanModerate ? (
                <div className="bc-chat__mod-row">
                  <button
                    type="button"
                    disabled={isSending || (!draft.trim() && pendingPhotos.length === 0)}
                    onClick={() => void sendMessage(true)}
                  >
                    <Megaphone className="h-3.5 w-3.5" aria-hidden />
                    Announcement
                  </button>
                  <button type="button" onClick={() => setPollOpen(true)}>
                    <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                    Poll
                  </button>
                </div>
              ) : null}
            </>
          }
        />
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
                    ×
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
              {isCreatingPoll ? "Posting…" : "Post poll"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reactionDetail != null && selectedReaction != null}
        onOpenChange={(open) => {
          if (!open) setReactionDetail(null)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {selectedReaction
                ? `${selectedReaction.summary.emoji} · ${selectedReaction.summary.count}`
                : "Reactions"}
            </DialogTitle>
          </DialogHeader>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {(selectedReaction?.summary.reactors ?? []).length === 0 ? (
              <li className="text-sm text-muted-foreground">No names yet.</li>
            ) : (
              (selectedReaction?.summary.reactors ?? []).map((reactor) => (
                <li
                  key={reactor.clerk_user_id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{reactor.display_name}</span>
                  {reactor.clerk_user_id === currentUserId ? (
                    <span className="text-xs font-medium text-primary">You</span>
                  ) : null}
                </li>
              ))
            )}
          </ul>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setReactionDetail(null)}>
              Close
            </Button>
            {selectedReaction ? (
              <Button
                type="button"
                variant={selectedReaction.summary.reacted_by_me ? "outline" : "default"}
                onClick={() => {
                  const messageId = selectedReaction.message.id
                  const emoji = selectedReaction.summary.emoji
                  void toggleReaction(messageId, String(emoji))
                }}
              >
                {selectedReaction.summary.reacted_by_me ? "Remove my reaction" : "Add reaction"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
