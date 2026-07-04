"use client"

import { useEffect, useState } from "react"
import { MessageSquare } from "lucide-react"
import { ChatThread } from "@/components/chat/chat-thread"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ChatChannelSummary } from "@/types/chat"

type ChatPageClientProps = {
  currentUserId: string
  isAdmin?: boolean
}

export function ChatPageClient({ currentUserId, isAdmin = false }: ChatPageClientProps) {
  const [channels, setChannels] = useState<ChatChannelSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setError(null)
      try {
        const response = await fetch("/api/chat/channels")
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || "Failed to load chats")
        }
        const data = await response.json()
        const list = (data.channels ?? []) as ChatChannelSummary[]
        setChannels(list)
        setSelectedId((current) => current ?? list[0]?.id ?? null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load chats")
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const selected = channels.find((channel) => channel.id === selectedId) ?? null
  const selectedCanModerate = Boolean(isAdmin || selected?.can_moderate)

  if (isLoading) {
    return <p className="text-muted-foreground">Loading your chats…</p>
  }

  if (error) {
    return <p className="text-destructive">{error}</p>
  }

  if (channels.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">No chats yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Register for a Rendezvous year to join that year&apos;s group chat. Past years you attended
          stay available here too.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <aside className="rounded-xl border bg-card p-2">
        <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Your chats
        </p>
        <div className="space-y-1">
          {channels.map((channel) => {
            const label =
              channel.channel_type === "year" && channel.event_year
                ? `Rendezvous ${channel.event_year}`
                : channel.name
            return (
              <Button
                key={channel.id}
                type="button"
                variant="ghost"
                className={cn(
                  "h-auto w-full justify-start px-3 py-3 text-left",
                  selectedId === channel.id && "bg-secondary",
                )}
                onClick={() => setSelectedId(channel.id)}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{label}</p>
                  {channel.last_message_preview ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {channel.last_message_preview}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No messages yet</p>
                  )}
                </div>
              </Button>
            )
          })}
        </div>
      </aside>

      <div className="min-h-[32rem]">
        {selected ? (
          <ChatThread
            channel={selected}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            canModerate={selectedCanModerate}
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border bg-card p-8 text-muted-foreground">
            Select a chat
          </div>
        )}
      </div>
    </div>
  )
}
