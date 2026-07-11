"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Camera, Loader2, Trash2, Users } from "lucide-react"
import Link from "next/link"
import { FAMILY_PHOTO_UPDATED_EVENT } from "@/components/user-menu-button"

export type FamilyDirectoryPhotoState = {
  photo_url: string | null
  directory_opt_in: boolean
  directory_blurb: string | null
  photo_updated_at?: string | null
}

type Props = {
  settings: FamilyDirectoryPhotoState
  onChange: (settings: FamilyDirectoryPhotoState) => void
  eventYear?: number
}

export function FamilyDirectoryPhotoCard({ settings, onChange, eventYear = 2027 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [blurb, setBlurb] = useState(settings.directory_blurb || "")
  const [optIn, setOptIn] = useState(settings.directory_opt_in)

  useEffect(() => {
    setOptIn(settings.directory_opt_in)
    setBlurb(settings.directory_blurb || "")
  }, [settings.directory_blurb, settings.directory_opt_in])
  const [enabledYears, setEnabledYears] = useState<number[]>([2026])

  useEffect(() => {
    async function loadEnabledYears() {
      try {
        const response = await fetch("/api/directory/years")
        const data = await response.json()
        setEnabledYears(data.years?.length ? data.years : [2026])
      } catch {
        setEnabledYears([2026])
      }
    }
    void loadEnabledYears()
  }, [])

  const previewYear = enabledYears.includes(eventYear)
    ? eventYear
    : enabledYears[0] ?? null

  async function handleUpload(file: File) {
    setUploading(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("photo", file)
      const response = await fetch("/api/family/directory", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Upload failed")
      }
      onChange(data.settings)
      setOptIn(Boolean(data.settings.directory_opt_in))
      setBlurb(data.settings.directory_blurb || "")
      window.dispatchEvent(
        new CustomEvent(FAMILY_PHOTO_UPDATED_EVENT, {
          detail: { photoUrl: data.settings.photo_url ?? null },
        }),
      )
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function handleRemovePhoto() {
    setUploading(true)
    setError("")
    try {
      const response = await fetch("/api/family/directory", { method: "DELETE" })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Could not remove photo")
      }
      onChange(data.settings)
      setBlurb(data.settings.directory_blurb || "")
      window.dispatchEvent(
        new CustomEvent(FAMILY_PHOTO_UPDATED_EVENT, {
          detail: { photoUrl: data.settings.photo_url ?? null },
        }),
      )
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove photo")
    } finally {
      setUploading(false)
    }
  }

  async function handleSaveSettings() {
    setSaving(true)
    setError("")
    try {
      const response = await fetch("/api/family/directory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directory_opt_in: optIn,
          directory_blurb: blurb.trim() || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Could not save directory settings")
      }
      onChange(data.settings)
      setOptIn(Boolean(data.settings.directory_opt_in))
      setBlurb(data.settings.directory_blurb || "")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Family Directory
        </CardTitle>
        <CardDescription>
          Registered {eventYear} families are listed in the attendee directory by default. Add an
          optional photo and note here, or opt out if you prefer not to appear.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative mx-auto h-40 w-40 shrink-0 overflow-hidden rounded-2xl border bg-muted sm:mx-0">
            {settings.photo_url ? (
              <Image
                src={settings.photo_url}
                alt="Your family directory photo"
                fill
                className="object-cover"
                sizes="160px"
                unoptimized
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
                <Users className="h-8 w-8" />
                No photo yet
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-3">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleUpload(file)
                event.target.value = ""
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {settings.photo_url ? "Replace photo" : "Upload photo"}
              </Button>
              {settings.photo_url && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleRemovePhoto()}
                  disabled={uploading}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, or WebP · max 5 MB · landscape or square photos work best.
            </p>
            {settings.photo_url && (
              <Badge variant="secondary" className="w-fit">
                Photo saved
                {settings.photo_updated_at
                  ? ` · ${new Date(settings.photo_updated_at).toLocaleDateString()}`
                  : ""}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="directory-opt-out"
              checked={!optIn}
              onCheckedChange={(checked) => setOptIn(!Boolean(checked))}
            />
            <div className="space-y-1">
              <Label htmlFor="directory-opt-out" className="cursor-pointer font-medium">
                Hide our family from the attendee directory
              </Label>
              <p className="text-sm text-muted-foreground">
                Registered families appear in the directory by default. Add a phone number on each
                family member (adults/teens) so the directory shows the right name with each number.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="directory-blurb">Short note (optional)</Label>
            <Textarea
              id="directory-blurb"
              value={blurb}
              onChange={(event) => setBlurb(event.target.value)}
              placeholder="e.g. First time at Rendezvous! Kids ages 8, 10, and 13."
              rows={3}
              maxLength={280}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void handleSaveSettings()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save directory settings
            </Button>
            {previewYear ? (
              <Button asChild variant="outline">
                <Link href={`/directory?year=${previewYear}`}>Preview directory</Link>
              </Button>
            ) : null}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
