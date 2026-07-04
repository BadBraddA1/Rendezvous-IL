"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, MessageSquarePlus, Trash2, UserMinus, UserPlus } from "lucide-react"
import { ChatThread } from "@/components/chat/chat-thread"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ChatChannelSummary } from "@/types/chat"

type ChatPerson = {
  id: string
  displayName: string
  email: string
  imageUrl: string
  role?: "member" | "moderator"
}

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

  const [people, setPeople] = useState<ChatPerson[]>([])
  const [channelMembers, setChannelMembers] = useState<ChatPerson[]>([])
  const [peopleQuery, setPeopleQuery] = useState("")
  const [membersLoading, setMembersLoading] = useState(false)
  const [memberActionId, setMemberActionId] = useState<string | null>(null)

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
      setSelectedId(
        (current) =>
          current ?? list.find((c) => c.channel_type === "custom")?.id ?? list[0]?.id ?? null,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load channels")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadPeople = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/chat/people")
      if (!response.ok) return
      const data = await response.json()
      setPeople((data.people ?? []) as ChatPerson[])
    } catch {
      // Non-fatal — channel list still works
    }
  }, [])

  const loadChannelMembers = useCallback(async (channelId: string) => {
    setMembersLoading(true)
    try {
      const response = await fetch(`/api/admin/chat/channels/${channelId}/members`)
      if (!response.ok) {
        setChannelMembers([])
        return
      }
      const data = await response.json()
      setChannelMembers((data.members ?? []) as ChatPerson[])
    } catch {
      setChannelMembers([])
    } finally {
      setMembersLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadChannels()
    void loadPeople()
  }, [loadChannels, loadPeople])

  useEffect(() => {
    if (!selectedId) {
      setChannelMembers([])
      return
    }
    void loadChannelMembers(selectedId)
  }, [selectedId, loadChannelMembers])

  const selected = channels.find((channel) => channel.id === selectedId) ?? null
  const memberIds = useMemo(() => new Set(channelMembers.map((m) => m.id)), [channelMembers])

  const filteredPeople = useMemo(() => {
    const query = peopleQuery.trim().toLowerCase()
    const list = people.filter((person) => !memberIds.has(person.id))
    if (!query) return list
    return list.filter(
      (person) =>
        person.displayName.toLowerCase().includes(query) ||
        person.email.toLowerCase().includes(query),
    )
  }, [people, memberIds, peopleQuery])

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
          member_clerk_ids: [],
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to create channel")
      }
      const data = await response.json()
      setName("")
      setDescription("")
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

  async function addMember(person: ChatPerson) {
    if (!canEdit || !selected) return
    setMemberActionId(person.id)
    setError(null)
    try {
      // Year channels only accept explicit moderator rows.
      const role = selected.channel_type === "year" ? "moderator" : "member"
      const response = await fetch(`/api/admin/chat/channels/${selected.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerk_user_id: person.id, role }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to add member")
      setChannelMembers((data.members ?? []) as ChatPerson[])
      await loadChannels()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member")
    } finally {
      setMemberActionId(null)
    }
  }

  async function toggleModerator(person: ChatPerson) {
    if (!canEdit || !selected) return
    setMemberActionId(person.id)
    setError(null)
    try {
      const role = person.role === "moderator" ? "member" : "moderator"
      // Year channels: demoting a mod removes the explicit row.
      if (selected.channel_type === "year" && role === "member") {
        await removeMember(person)
        return
      }
      const response = await fetch(`/api/admin/chat/channels/${selected.id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerk_user_id: person.id, role }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to update moderator")
      setChannelMembers((data.members ?? []) as ChatPerson[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update moderator")
    } finally {
      setMemberActionId(null)
    }
  }

  async function removeMember(person: ChatPerson) {
    if (!canEdit || !selected) return
    setMemberActionId(person.id)
    setError(null)
    try {
      const response = await fetch(
        `/api/admin/chat/channels/${selected.id}/members?clerk_user_id=${encodeURIComponent(person.id)}`,
        { method: "DELETE" },
      )
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to remove member")
      setChannelMembers((data.members ?? []) as ChatPerson[])
      await loadChannels()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member")
    } finally {
      setMemberActionId(null)
    }
  }

  if (isLoading) {
    return <p className="text-muted-foreground">Loading chat channels…</p>
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[20rem_1fr_22rem]">
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
                          <p className="text-xs text-muted-foreground">
                            {channel.member_count} members
                          </p>
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
            <div className="space-y-3 rounded-xl border bg-card p-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="chat-test">Mark as test channel</Label>
                <Switch id="chat-test" checked={isTest} onCheckedChange={setIsTest} />
              </div>
              <p className="text-xs text-muted-foreground">
                Create the channel first, then add people from the member list on the right.
              </p>
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
            <ChatThread
              channel={selected}
              currentUserId={currentUserId}
              isAdmin
              canModerate
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border bg-card p-8 text-muted-foreground">
              Select a channel to chat
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-1 text-sm font-medium">Channel members</p>
            {selected?.channel_type === "year" ? (
              <p className="mb-3 text-xs text-muted-foreground">
                Year chats include registered families automatically. You can still promote
                moderators who can delete messages and post announcements in this room.
              </p>
            ) : (
              <p className="mb-3 text-xs text-muted-foreground">
                People in this channel. Moderators can delete messages and post announcements.
              </p>
            )}
            {membersLoading ? (
              <p className="text-sm text-muted-foreground">Loading members…</p>
            ) : channelMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {channelMembers.map((member) => (
                  <li key={member.id} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{member.displayName}</p>
                        {member.role === "moderator" ? (
                          <Badge variant="secondary">Mod</Badge>
                        ) : null}
                      </div>
                      {member.email ? (
                        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                      ) : null}
                    </div>
                    {canEdit ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={memberActionId === member.id}
                          onClick={() => void toggleModerator(member)}
                        >
                          {member.role === "moderator" ? "Remove mod" : "Make mod"}
                        </Button>
                        {selected?.channel_type === "custom" || member.role === "moderator" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={memberActionId === member.id}
                            onClick={() => void removeMember(member)}
                          >
                            {memberActionId === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserMinus className="h-4 w-4" />
                            )}
                            <span className="sr-only">Remove</span>
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canEdit ? (
            <div className="rounded-xl border bg-card p-4">
              <p className="mb-3 text-sm font-medium">
                {selected?.channel_type === "year" ? "Add moderators" : "Add people"}
              </p>
              <Input
                value={peopleQuery}
                onChange={(event) => setPeopleQuery(event.target.value)}
                placeholder="Search by name or email"
                className="mb-3"
              />
              {people.length === 0 ? (
                <p className="text-sm text-muted-foreground">Loading accounts…</p>
              ) : filteredPeople.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matching people to add.</p>
              ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto">
                  {filteredPeople.map((person) => (
                    <li key={person.id} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{person.displayName}</p>
                        {person.email ? (
                          <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={memberActionId === person.id}
                        onClick={() => void addMember(person)}
                      >
                        {memberActionId === person.id ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="mr-1 h-4 w-4" />
                        )}
                        {selected?.channel_type === "year" ? "Make mod" : "Add"}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
