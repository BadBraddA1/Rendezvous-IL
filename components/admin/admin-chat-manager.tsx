"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, MessageSquarePlus, Trash2 } from "lucide-react"
import { ChatThread } from "@/components/chat/chat-thread"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ChatChannelSummary } from "@/types/chat"

type AdminChatManagerProps = {
  currentUserId: string
  canEdit: boolean
}

export function AdminChatManager({ currentUserId, canEdit }: AdminChatManagerProps) {
  const [channels, setChannels] = useState<ChatChannelSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isTest, setIsTest] = useState(true)
  const [memberIds, setMemberIds] = useState("")

  const loadChannels = useCallback(async () => {
    setError(null)
    try {
      const response = await fetch("/api/admin/chat/channels")
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to load channels")
      }
      const data = await response.json()
      const list = (data.channels ?? []) as ChatChannelSummary[]
      setChannels(list)
      setSelectedId((current) => current ?? list.find((c) => c.channel_type === "custom")?.id ?? list[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load channels")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadChannels()
  }, [loadChannels])

  const selected = channels.find((channel) => channel.id === selectedId) ?? null

  async function createChannel() {
    if (!canEdit || !name.trim()) return
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          is_test: isTest,
          member_clerk_ids: memberIds
            .split(/[\s,]+/)
            .map((id) => id.trim())
            .filter(Boolean),
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to create channel")
      }
      const data = await response.json()
      setName("")
      setDescription("")
      setMemberIds("")
      await loadChannels()
      if (data.channel?.id) setSelectedId(data.channel.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create channel")
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteChannel(channelId: string) {
    if (!canEdit || !confirm("Delete this test channel and all its messages?")) return
    const response = await fetch(`/api/admin/chat/channels/${channelId}`, { method: "DELETE" })
    if (!response.ok) return
    await loadChannels()
    setSelectedId(null)
  }

  if (isLoading) {
    return <p className="text-muted-foreground">Loading chat channels…</p>
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[20rem_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-3 text-sm font-medium">Channels</p>
            <div className="space-y-1">
              {channels.map((channel) => {
                const label =
                  channel.channel_type === "year" && channel.event_year
                    ? `Rendezvous ${channel.event_year}`
                    : channel.name
                return (
                  <div key={channel.id} className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className={cn(
                        "h-auto flex-1 justify-start px-3 py-2 text-left",
                        selectedId === channel.id && "bg-secondary",
                      )}
                      onClick={() => setSelectedId(channel.id)}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{label}</span>
                          {channel.is_test ? <Badge variant="outline">Test</Badge> : null}
                          {channel.channel_type === "year" ? (
                            <Badge variant="secondary">Year</Badge>
                          ) : null}
                        </div>
                        {channel.member_count != null ? (
                          <p className="text-xs text-muted-foreground">{channel.member_count} members</p>
                        ) : null}
                      </div>
                    </Button>
                    {canEdit && channel.channel_type === "custom" ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => void deleteChannel(channel.id)}
                        aria-label="Delete channel"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          {canEdit ? (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="h-4 w-4" />
                <p className="font-medium">New test channel</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chat-name">Name</Label>
                <Input
                  id="chat-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Staff test chat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chat-description">Description</Label>
                <Textarea
                  id="chat-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chat-members">Member Clerk IDs (optional)</Label>
                <Textarea
                  id="chat-members"
                  value={memberIds}
                  onChange={(event) => setMemberIds(event.target.value)}
                  placeholder="user_abc, user_def"
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="chat-test">Mark as test channel</Label>
                <Switch id="chat-test" checked={isTest} onCheckedChange={setIsTest} />
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={!name.trim() || isSaving}
                onClick={() => void createChannel()}
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create channel
              </Button>
            </div>
          ) : null}
        </div>

        <div className="min-h-[36rem]">
          {selected ? (
            <ChatThread channel={selected} currentUserId={currentUserId} isAdmin />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border bg-card p-8 text-muted-foreground">
              Select a channel to chat
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
