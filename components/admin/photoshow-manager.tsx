"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ArrowDown, ArrowUp, Copy, ExternalLink, Eye, EyeOff, Images, Loader2, MessageSquare, Trash2, Upload } from "lucide-react"
import { AdminConfirmDialog } from "./admin-confirm-dialog"
import { AdminListSkeleton, AdminRetryButton } from "./admin-panel-states"
import type { ChatPhotoshowChannel } from "@/lib/live-updates/chat-photoshow"
import type { PhotoshowPhoto } from "@/lib/live-updates/photoshow-shared"
import { LIVE_UPDATES_ROOM_SUGGESTIONS, withRoomQuery } from "@/lib/live-updates/rooms"

export function PhotoshowManager({ canEdit }: { canEdit: boolean }) {
  const [photos, setPhotos] = useState<PhotoshowPhoto[]>([])
  const [chatChannels, setChatChannels] = useState<ChatPhotoshowChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [deletePending, setDeletePending] = useState<PhotoshowPhoto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [tvRoom, setTvRoom] = useState("")
  const [manageChannelId, setManageChannelId] = useState<string | null>(null)
  const [chatPhotos, setChatPhotos] = useState<PhotoshowPhoto[]>([])
  const [chatPhotosLoading, setChatPhotosLoading] = useState(false)
  const [hidingPhotoId, setHidingPhotoId] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch("/api/admin/photoshow")
      if (!res.ok) throw new Error(`Could not load photos (${res.status})`)
      const data = await res.json()
      setPhotos(Array.isArray(data.photos) ? data.photos : [])
      setChatChannels(Array.isArray(data.chatChannels) ? data.chatChannels : [])
    } catch (error) {
      setPhotos([])
      setChatChannels([])
      setFetchError(error instanceof Error ? error.message : "Could not load photos")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadChatPhotos = useCallback(async (channelId: string) => {
    setChatPhotosLoading(true)
    try {
      const res = await fetch(
        `/api/admin/photoshow/chat?channel=${encodeURIComponent(channelId)}`,
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not load chat photos")
      setChatPhotos(Array.isArray(data.photos) ? data.photos : [])
    } catch (error) {
      setChatPhotos([])
      toast({
        title: "Could not load chat photos",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setChatPhotosLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!manageChannelId) {
      setChatPhotos([])
      return
    }
    void loadChatPhotos(manageChannelId)
  }, [manageChannelId, loadChatPhotos])

  const openManageChannel = (channelId: string) => {
    setManageChannelId((prev) => (prev === channelId ? null : channelId))
  }

  const toggleChatPhotoHidden = async (photo: PhotoshowPhoto) => {
    if (!manageChannelId || !canEdit) return
    setHidingPhotoId(photo.id)
    try {
      const res = await fetch("/api/admin/photoshow/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoId: photo.id,
          channelId: manageChannelId,
          hidden: photo.is_active,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed")
      if (Array.isArray(data.photos)) setChatPhotos(data.photos)
      toast({
        title: photo.is_active ? "Photo hidden from TVs" : "Photo shown on TVs again",
      })
      void fetchData()
    } catch (error) {
      toast({
        title: "Could not update photo",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setHidingPhotoId(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "Choose a photo", variant: "destructive" })
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append("photo", file)
      if (caption.trim()) form.append("caption", caption.trim())
      const res = await fetch("/api/admin/photoshow", { method: "POST", body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Upload failed")
      toast({ title: "Photo added", description: "It will appear on Live Updates within about a minute." })
      setFile(null)
      setCaption("")
      void fetchData()
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const toggleActive = async (photo: PhotoshowPhoto) => {
    try {
      const res = await fetch(`/api/admin/photoshow/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !photo.is_active }),
      })
      if (!res.ok) throw new Error("Failed")
      void fetchData()
    } catch {
      toast({ title: "Could not update photo", variant: "destructive" })
    }
  }

  const saveCaption = async (photo: PhotoshowPhoto, nextCaption: string) => {
    try {
      const res = await fetch(`/api/admin/photoshow/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: nextCaption }),
      })
      if (!res.ok) throw new Error("Failed")
      void fetchData()
    } catch {
      toast({ title: "Could not save caption", variant: "destructive" })
    }
  }

  const movePhoto = async (index: number, direction: -1 | 1) => {
    const next = index + direction
    if (next < 0 || next >= photos.length) return
    const ordered = [...photos]
    const [item] = ordered.splice(index, 1)
    ordered.splice(next, 0, item)
    setPhotos(ordered)
    try {
      const res = await fetch("/api/admin/photoshow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: ordered.map((p) => p.id) }),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      if (Array.isArray(data.photos)) setPhotos(data.photos)
    } catch {
      toast({ title: "Could not reorder", variant: "destructive" })
      void fetchData()
    }
  }

  const confirmDelete = async () => {
    if (!deletePending) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/photoshow/${deletePending.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Photo removed" })
      setDeletePending(null)
      void fetchData()
    } catch {
      toast({ title: "Could not delete photo", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  const tvPathFor = (path: string) => withRoomQuery(path, tvRoom)

  const copyTvUrl = async (path: string) => {
    const url = `https://rendezvousil.com${tvPathFor(path)}`
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: "TV link copied",
        description: tvRoom.trim() ? `Room: ${tvRoom.trim()}` : undefined,
      })
    } catch {
      toast({ title: "Could not copy", description: url, variant: "destructive" })
    }
  }

  const activeCount = photos.filter((p) => p.is_active).length
  const chatsWithPhotos = chatChannels.filter(
    (c) => c.photo_count > 0 || c.hidden_count > 0,
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat photoshows
          </CardTitle>
          <CardDescription>
            Every chat gets its own slideshow from photos people post in that channel. TVs show who
            submitted each photo. Use Manage to hide a photo from screens without deleting the chat
            message.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tv-room">Room on TV links (optional)</Label>
            <Input
              id="tv-room"
              list="photoshow-room-suggestions"
              value={tvRoom}
              onChange={(e) => setTvRoom(e.target.value)}
              placeholder="e.g. Activities Center"
              maxLength={80}
            />
            <datalist id="photoshow-room-suggestions">
              {LIVE_UPDATES_ROOM_SUGGESTIONS.map((room) => (
                <option key={room} value={room} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">
              Copied / preview links include <code>?room=…</code> so the TV shows “This screen ·
              …” You can also assign rooms later under Admin → Displays.
            </p>
          </div>
          {loading ? (
            <AdminListSkeleton rows={2} />
          ) : fetchError ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{fetchError}</p>
              <AdminRetryButton onRetry={() => void fetchData()} label="Reload" />
            </div>
          ) : chatChannels.length === 0 ? (
            <p className="text-sm text-muted-foreground">No chat channels yet.</p>
          ) : (
            <div className="space-y-3">
              {chatChannels.map((channel) => {
                const path = tvPathFor(channel.tv_path)
                const isOpen = manageChannelId === channel.id
                return (
                  <div key={channel.id} className="space-y-3 rounded-lg border p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{channel.name}</span>
                          {channel.channel_type === "year" && channel.event_year != null && (
                            <Badge variant="secondary">{channel.event_year}</Badge>
                          )}
                          {channel.is_test && <Badge variant="outline">Test</Badge>}
                          {!channel.is_active && <Badge variant="outline">Inactive</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground tabular-nums">
                          {channel.photo_count === 0
                            ? "No photos showing"
                            : `${channel.photo_count} on TVs`}
                          {channel.hidden_count > 0
                            ? ` · ${channel.hidden_count} hidden`
                            : ""}
                        </p>
                        <code className="block break-all text-xs text-muted-foreground">
                          {path}
                        </code>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={isOpen ? "default" : "outline"}
                          size="sm"
                          onClick={() => openManageChannel(channel.id)}
                        >
                          {isOpen ? "Close" : "Manage photos"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void copyTvUrl(channel.tv_path)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy TV link
                        </Button>
                        <Button type="button" variant="secondary" size="sm" asChild>
                          <Link href={path} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Preview
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t pt-3">
                        {chatPhotosLoading ? (
                          <AdminListSkeleton rows={2} />
                        ) : chatPhotos.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No photos in this chat yet.
                          </p>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {chatPhotos.map((photo) => (
                              <div
                                key={photo.id}
                                className={`space-y-2 rounded-md border p-3 ${
                                  photo.is_active ? "" : "opacity-60"
                                }`}
                              >
                                <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
                                  <Image
                                    src={photo.image_url}
                                    alt={photo.caption || photo.submitted_by || "Chat photo"}
                                    fill
                                    unoptimized
                                    className="object-cover"
                                    sizes="(max-width: 640px) 100vw, 33vw"
                                  />
                                </div>
                                <div className="space-y-1 text-sm">
                                  <p className="font-medium">
                                    {photo.submitted_by
                                      ? `Photo by ${photo.submitted_by}`
                                      : "Unknown sender"}
                                  </p>
                                  {photo.caption && (
                                    <p className="line-clamp-2 text-muted-foreground">
                                      {photo.caption}
                                    </p>
                                  )}
                                  <Badge variant={photo.is_active ? "default" : "secondary"}>
                                    {photo.is_active ? "On TVs" : "Hidden"}
                                  </Badge>
                                </div>
                                {canEdit && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    disabled={hidingPhotoId === photo.id}
                                    onClick={() => void toggleChatPhotoHidden(photo)}
                                  >
                                    {hidingPhotoId === photo.id ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : photo.is_active ? (
                                      <EyeOff className="mr-2 h-4 w-4" />
                                    ) : (
                                      <Eye className="mr-2 h-4 w-4" />
                                    )}
                                    {photo.is_active ? "Hide from TVs" : "Show on TVs"}
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {chatsWithPhotos.length === 0 && (
                <p className="pt-1 text-sm text-muted-foreground">
                  Photos appear here after someone posts an image in chat.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Images className="h-5 w-5" />
            Manual room photoshow
          </CardTitle>
          <CardDescription>
            Curated slides for Live Updates program boards (and a shared room TV). Separate from
            chat feeds. Active slides: <strong>{activeCount}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground space-y-2">
            <p>
              <strong className="text-foreground">In the program rotation:</strong>{" "}
              photoshow appears automatically when at least one photo is active.
            </p>
            <p>
              <strong className="text-foreground">Dedicated room slideshow</strong> (manual uploads
              only):
            </p>
            <code className="block break-all rounded bg-background px-3 py-2 text-xs text-foreground">
              https://rendezvousil.com/live-updates?kiosk=1&amp;view=photoshow
            </code>
            <p>All screens stay on the same photo at the same time (5 seconds each).</p>
          </div>

          {canEdit && (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="photoshow-file">Photo (JPG, PNG, or WebP, max 5 MB)</Label>
                  <Input
                    id="photoshow-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photoshow-caption">Caption (optional)</Label>
                  <Input
                    id="photoshow-caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="e.g. Welcome to Rendezvous 2027"
                    maxLength={200}
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={() => void handleUpload()}
                disabled={uploading || !file}
                className="min-h-11"
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <AdminListSkeleton rows={3} />
      ) : fetchError ? null : photos.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No manual photos yet. Upload above, or use a chat photoshow link instead.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {photos.map((photo, index) => (
            <Card key={photo.id} className={!photo.is_active ? "opacity-60" : undefined}>
              <CardContent className="space-y-3 p-4">
                <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
                  <Image
                    src={photo.image_url}
                    alt={photo.caption || "Photoshow slide"}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={photo.is_active ? "default" : "secondary"}>
                    {photo.is_active ? "Active" : "Hidden"}
                  </Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    #{index + 1}
                  </span>
                </div>
                {canEdit ? (
                  <>
                    <Input
                      defaultValue={photo.caption ?? ""}
                      placeholder="Caption"
                      onBlur={(e) => {
                        const next = e.target.value.trim()
                        if (next !== (photo.caption ?? "")) {
                          void saveCaption(photo, next)
                        }
                      }}
                    />
                    <div className="admin-action-row flex flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={photo.is_active}
                          onCheckedChange={() => void toggleActive(photo)}
                          id={`active-${photo.id}`}
                        />
                        <Label htmlFor={`active-${photo.id}`} className="cursor-pointer">
                          Show on TVs
                        </Label>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={index === 0}
                        onClick={() => void movePhoto(index, -1)}
                        aria-label="Move earlier"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={index === photos.length - 1}
                        onClick={() => void movePhoto(index, 1)}
                        aria-label="Move later"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => setDeletePending(photo)}
                        aria-label="Delete photo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {photo.caption || "No caption"}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AdminConfirmDialog
        open={Boolean(deletePending)}
        onOpenChange={(open) => {
          if (!open) setDeletePending(null)
        }}
        title="Remove this photo?"
        description="It will disappear from all room screens on the next refresh."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
