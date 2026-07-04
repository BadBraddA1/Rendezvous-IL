"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ArrowDown, ArrowUp, Images, Loader2, Trash2, Upload } from "lucide-react"
import { AdminConfirmDialog } from "./admin-confirm-dialog"
import { AdminListSkeleton, AdminRetryButton } from "./admin-panel-states"
import type { PhotoshowPhoto } from "@/lib/live-updates/photoshow-shared"

export function PhotoshowManager({ canEdit }: { canEdit: boolean }) {
  const [photos, setPhotos] = useState<PhotoshowPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [deletePending, setDeletePending] = useState<PhotoshowPhoto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch("/api/admin/photoshow")
      if (!res.ok) throw new Error(`Could not load photos (${res.status})`)
      const data = await res.json()
      setPhotos(Array.isArray(data.photos) ? data.photos : [])
    } catch (error) {
      setPhotos([])
      setFetchError(error instanceof Error ? error.message : "Could not load photos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

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

  const activeCount = photos.filter((p) => p.is_active).length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Images className="h-5 w-5" />
            Room photoshow
          </CardTitle>
          <CardDescription>
            Photos rotate on Live Updates (program boards) and can run full-screen on room TVs.
            Active slides: <strong>{activeCount}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground space-y-2">
            <p>
              <strong className="text-foreground">In the program rotation:</strong>{" "}
              photoshow appears automatically when at least one photo is active.
            </p>
            <p>
              <strong className="text-foreground">Dedicated room slideshow</strong> (replaces a
              laptop slideshow): point the Pi/TV at
            </p>
            <code className="block break-all rounded bg-background px-3 py-2 text-xs text-foreground">
              https://rendezvousil.com/live-updates?kiosk=1&amp;view=photoshow
            </code>
            <p>All screens stay on the same photo at the same time (8 seconds each).</p>
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
      ) : fetchError ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{fetchError}</p>
          <AdminRetryButton onRetry={() => void fetchData()} label="Reload" />
        </div>
      ) : photos.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No photos yet. Upload a few to replace the room slideshows.
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
