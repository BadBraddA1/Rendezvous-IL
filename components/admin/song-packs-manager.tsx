"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowDown,
  ArrowUp,
  FileText,
  Loader2,
  Music,
  Plus,
  Trash2,
  Upload,
} from "lucide-react"
import { AdminConfirmDialog } from "./admin-confirm-dialog"
import { AdminListSkeleton, AdminRetryButton } from "./admin-panel-states"
import type { SongPack, SongPackDetail, SongPackItem } from "@/lib/song-packs"
import {
  DEFAULT_REGISTRATION_EVENT_YEAR,
  REGISTRATION_EVENT_YEARS,
  registrationYearLabel,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"

export function SongPacksManager({ canEdit }: { canEdit: boolean }) {
  const [year, setYear] = useState<RegistrationEventYear>(DEFAULT_REGISTRATION_EVENT_YEAR)
  const [packs, setPacks] = useState<SongPack[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<SongPackDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [newPackName, setNewPackName] = useState("")
  const [creating, setCreating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [songTitle, setSongTitle] = useState("")
  const [songFile, setSongFile] = useState<File | null>(null)
  const [deletePackPending, setDeletePackPending] = useState<SongPack | null>(null)
  const [deleteItemPending, setDeleteItemPending] = useState<SongPackItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const fetchPacks = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`/api/admin/songs?year=${year}`)
      if (!res.ok) throw new Error(`Could not load packs (${res.status})`)
      const data = await res.json()
      const next = Array.isArray(data.packs) ? (data.packs as SongPack[]) : []
      setPacks(next)
      setSelectedId((prev) => {
        if (prev && next.some((p) => p.id === prev)) return prev
        return next[0]?.id ?? null
      })
    } catch (error) {
      setPacks([])
      setFetchError(error instanceof Error ? error.message : "Could not load packs")
    } finally {
      setLoading(false)
    }
  }, [year])

  const fetchDetail = useCallback(async (packId: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/songs/${packId}`)
      if (!res.ok) throw new Error(`Could not load pack (${res.status})`)
      const data = await res.json()
      setDetail(data.pack ?? null)
    } catch (error) {
      setDetail(null)
      toast({
        title: "Could not load pack",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setDetailLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void fetchPacks()
  }, [fetchPacks])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    void fetchDetail(selectedId)
  }, [selectedId, fetchDetail])

  const createPack = async () => {
    if (!canEdit || !newPackName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/admin/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPackName.trim(), year }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Create failed")
      toast({ title: "Pack created" })
      setNewPackName("")
      await fetchPacks()
      if (data.pack?.id) setSelectedId(String(data.pack.id))
    } catch (error) {
      toast({
        title: "Could not create pack",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const togglePublished = async (pack: SongPackDetail) => {
    if (!canEdit) return
    try {
      const res = await fetch(`/api/admin/songs/${pack.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !pack.is_published }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Update failed")
      setDetail(data.pack)
      void fetchPacks()
      toast({
        title: !pack.is_published ? "Pack published" : "Pack unpublished",
        description: !pack.is_published
          ? "Registered families can download it in the app."
          : "Hidden from the app until published again.",
      })
    } catch (error) {
      toast({
        title: "Could not update pack",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      })
    }
  }

  const savePackMeta = async () => {
    if (!canEdit || !detail) return
    try {
      const res = await fetch(`/api/admin/songs/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: detail.name,
          description: detail.description,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Save failed")
      setDetail(data.pack)
      void fetchPacks()
      toast({ title: "Pack saved" })
    } catch (error) {
      toast({
        title: "Could not save pack",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      })
    }
  }

  const uploadSong = async () => {
    if (!canEdit || !detail || !songFile) {
      toast({ title: "Choose a PDF or image", variant: "destructive" })
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", songFile)
      if (songTitle.trim()) form.append("title", songTitle.trim())
      const res = await fetch(`/api/admin/songs/${detail.id}/items`, {
        method: "POST",
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setDetail(data.pack)
      setSongFile(null)
      setSongTitle("")
      void fetchPacks()
      toast({ title: "Song added" })
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

  const moveItem = async (index: number, direction: -1 | 1) => {
    if (!canEdit || !detail) return
    const next = index + direction
    if (next < 0 || next >= detail.items.length) return
    const ordered = [...detail.items]
    const [item] = ordered.splice(index, 1)
    ordered.splice(next, 0, item)
    setDetail({ ...detail, items: ordered })
    try {
      const res = await fetch(`/api/admin/songs/${detail.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: ordered.map((i) => i.id) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Reorder failed")
      if (data.pack) setDetail(data.pack)
    } catch {
      toast({ title: "Could not reorder", variant: "destructive" })
      void fetchDetail(detail.id)
    }
  }

  const confirmDeletePack = async () => {
    if (!deletePackPending) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/songs/${deletePackPending.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      toast({ title: "Pack deleted" })
      setDeletePackPending(null)
      if (selectedId === deletePackPending.id) setSelectedId(null)
      void fetchPacks()
    } catch {
      toast({ title: "Could not delete pack", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  const confirmDeleteItem = async () => {
    if (!deleteItemPending || !detail) return
    setDeleting(true)
    try {
      const res = await fetch(
        `/api/admin/songs/${detail.id}/items/${deleteItemPending.id}`,
        { method: "DELETE" },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Delete failed")
      toast({ title: "Song removed" })
      setDeleteItemPending(null)
      if (data.pack) setDetail(data.pack)
      void fetchPacks()
    } catch {
      toast({ title: "Could not delete song", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  const formatBytes = (n: number) => {
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {REGISTRATION_EVENT_YEARS.map((y) => (
          <Button
            key={y}
            type="button"
            size="sm"
            variant={year === y ? "default" : "outline"}
            onClick={() => setYear(y)}
          >
            {registrationYearLabel(y)}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Song packs
          </CardTitle>
          <CardDescription>
            Upload PDFs or images for Campfire, Racket Ball Singing, and other nights without
            screens. Published packs download to the app for offline use.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEdit && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="new-pack">New pack name</Label>
                <Input
                  id="new-pack"
                  value={newPackName}
                  onChange={(e) => setNewPackName(e.target.value)}
                  placeholder="e.g. Campfire"
                  maxLength={80}
                />
              </div>
              <Button
                type="button"
                onClick={() => void createPack()}
                disabled={creating || !newPackName.trim()}
              >
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add pack
              </Button>
            </div>
          )}

          {loading ? (
            <AdminListSkeleton rows={2} />
          ) : fetchError ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{fetchError}</p>
              <AdminRetryButton onRetry={() => void fetchPacks()} label="Reload" />
            </div>
          ) : packs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No packs yet for this year.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {packs.map((pack) => (
                <Button
                  key={pack.id}
                  type="button"
                  size="sm"
                  variant={selectedId === pack.id ? "default" : "outline"}
                  onClick={() => setSelectedId(pack.id)}
                >
                  {pack.name}
                  <Badge variant="secondary" className="ml-2 tabular-nums">
                    {pack.item_count ?? 0}
                  </Badge>
                  {pack.is_published ? null : (
                    <Badge variant="outline" className="ml-1">
                      Draft
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedId && (
        <Card>
          <CardHeader>
            <CardTitle>{detail?.name ?? "Pack"}</CardTitle>
            <CardDescription>
              Add songs in order. Families open this pack in the app and can use it offline at the
              campfire.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {detailLoading || !detail ? (
              <AdminListSkeleton rows={3} />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pack-name">Name</Label>
                    <Input
                      id="pack-name"
                      value={detail.name}
                      disabled={!canEdit}
                      onChange={(e) => setDetail({ ...detail, name: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end gap-3 pb-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="pack-published"
                        checked={detail.is_published}
                        disabled={!canEdit}
                        onCheckedChange={() => void togglePublished(detail)}
                      />
                      <Label htmlFor="pack-published">Published to app</Label>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pack-desc">Description</Label>
                  <Textarea
                    id="pack-desc"
                    value={detail.description ?? ""}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setDetail({ ...detail, description: e.target.value || null })
                    }
                    rows={2}
                  />
                </div>
                {canEdit && (
                  <div className="admin-action-row flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void savePackMeta()}>
                      Save pack details
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setDeletePackPending(detail)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete pack
                    </Button>
                  </div>
                )}

                {canEdit && (
                  <div className="rounded-lg border p-4 space-y-3">
                    <p className="text-sm font-medium">Add song</p>
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="song-title">Title</Label>
                          <Input
                            id="song-title"
                            value={songTitle}
                            onChange={(e) => setSongTitle(e.target.value)}
                            placeholder="Song title"
                            maxLength={120}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="song-file">PDF or image (JPG/PNG/WebP)</Label>
                          <Input
                            id="song-file"
                            type="file"
                            accept="application/pdf,image/jpeg,image/png,image/webp"
                            onChange={(e) => setSongFile(e.target.files?.[0] ?? null)}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => void uploadSong()}
                        disabled={uploading || !songFile}
                      >
                        {uploading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        Upload
                      </Button>
                    </div>
                  </div>
                )}

                {detail.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No songs in this pack yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.items.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="font-medium">
                              {index + 1}. {item.title}
                            </span>
                            <Badge variant="outline">{item.file_type.toUpperCase()}</Badge>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {formatBytes(item.byte_size)}
                            </span>
                          </div>
                          <a
                            href={item.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block break-all text-xs text-primary hover:underline"
                          >
                            Preview file
                          </a>
                        </div>
                        {canEdit && (
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              disabled={index === 0}
                              onClick={() => void moveItem(index, -1)}
                              aria-label="Move earlier"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              disabled={index === detail.items.length - 1}
                              onClick={() => void moveItem(index, 1)}
                              aria-label="Move later"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => setDeleteItemPending(item)}
                              aria-label="Delete song"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <AdminConfirmDialog
        open={Boolean(deletePackPending)}
        onOpenChange={(open) => {
          if (!open) setDeletePackPending(null)
        }}
        title="Delete this pack?"
        description="All songs and files in the pack will be removed."
        confirmLabel="Delete pack"
        loading={deleting}
        onConfirm={() => void confirmDeletePack()}
      />
      <AdminConfirmDialog
        open={Boolean(deleteItemPending)}
        onOpenChange={(open) => {
          if (!open) setDeleteItemPending(null)
        }}
        title="Remove this song?"
        description="It will disappear from app downloads on the next refresh."
        confirmLabel="Remove"
        loading={deleting}
        onConfirm={() => void confirmDeleteItem()}
      />
    </div>
  )
}
