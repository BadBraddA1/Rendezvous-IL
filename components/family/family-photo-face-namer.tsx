"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ScanFace, Sparkles } from "lucide-react"
import { FamilyPhotoFaceLabels } from "@/components/family/family-photo-face-labels"

export type ManageableFace = {
  id: number
  x: number
  y: number
  w: number
  h: number
  label: string | null
  sort_order?: number
}

type Props = {
  photoUrl: string
  initialFaces?: ManageableFace[]
  initialSuggestions?: string[]
}

export function FamilyPhotoFaceNamer({
  photoUrl,
  initialFaces = [],
  initialSuggestions = [],
}: Props) {
  const [faces, setFaces] = useState<ManageableFace[]>(initialFaces)
  const [suggestions, setSuggestions] = useState<string[]>(initialSuggestions)
  const [selectedId, setSelectedId] = useState<number | null>(
    initialFaces.find((f) => !f.label)?.id ?? initialFaces[0]?.id ?? null,
  )
  const [saving, setSaving] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [loading, setLoading] = useState(initialFaces.length === 0)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setFaces(initialFaces)
    setSuggestions(initialSuggestions)
    if (initialFaces.length > 0) {
      setSelectedId(initialFaces.find((f) => !f.label)?.id ?? initialFaces[0]?.id ?? null)
      setLoading(false)
    }
  }, [initialFaces, initialSuggestions, photoUrl])

  useEffect(() => {
    if (initialFaces.length > 0) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        const response = await fetch("/api/family/directory/faces")
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Could not load faces")
        if (cancelled) return
        const next = (data.faces || []) as ManageableFace[]
        setFaces(next)
        setSuggestions((data.name_suggestions || []) as string[])
        setSelectedId(next.find((f) => !f.label)?.id ?? next[0]?.id ?? null)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load faces")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [photoUrl, initialFaces.length])

  const selected = faces.find((face) => face.id === selectedId) || null

  function setLabel(faceId: number, label: string) {
    setFaces((prev) =>
      prev.map((face) => (face.id === faceId ? { ...face, label: label || null } : face)),
    )
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      const response = await fetch("/api/family/directory/faces", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faces: faces.map((face) => ({ id: face.id, label: face.label })),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not save names")
      setFaces(data.faces || faces)
      setSaved(true)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save names")
    } finally {
      setSaving(false)
    }
  }

  async function handleDetect() {
    setDetecting(true)
    setError("")
    setSaved(false)
    try {
      const response = await fetch("/api/family/directory/faces", { method: "POST" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not find faces")
      const next = (data.faces || []) as ManageableFace[]
      setFaces(next)
      setSuggestions((data.name_suggestions || []) as string[])
      setSelectedId(next.find((f) => !f.label)?.id ?? next[0]?.id ?? null)
    } catch (detectError) {
      setError(detectError instanceof Error ? detectError.message : "Could not find faces")
    } finally {
      setDetecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Looking for faces in your photo…
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 font-medium">
          <ScanFace className="h-4 w-4" />
          Name the faces
        </h3>
        <p className="text-sm text-muted-foreground">
          Tap each person in the photo, then pick or type their name. Names show under their face
          in the directory.
        </p>
      </div>

      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl border bg-muted">
        {/* Intrinsic size so face % boxes match the pixels (no object-cover crop). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt="Family photo for naming faces"
          className="block h-auto w-full"
        />
        <FamilyPhotoFaceLabels faces={faces} showUnlabeledPlaceholders />
        {faces.map((face) => (
          <button
            key={face.id}
            type="button"
            className={`absolute rounded-md border-2 transition ${
              selectedId === face.id
                ? "border-primary bg-primary/15"
                : face.label
                  ? "border-white/70 bg-transparent"
                  : "border-dashed border-white/80 bg-black/10"
            }`}
            style={{
              left: `${face.x * 100}%`,
              top: `${face.y * 100}%`,
              width: `${face.w * 100}%`,
              height: `${face.h * 100}%`,
            }}
            onClick={() => setSelectedId(face.id)}
            aria-label={face.label ? `Edit name for ${face.label}` : "Name this face"}
          />
        ))}
      </div>

      {faces.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No faces found yet. Try “Find faces” — works best with clear front-facing people.
          </p>
          <Button type="button" variant="outline" onClick={() => void handleDetect()} disabled={detecting}>
            {detecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Find faces
          </Button>
        </div>
      ) : selected ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="face-name">Name for selected person</Label>
            <Input
              id="face-name"
              value={selected.label || ""}
              onChange={(event) => setLabel(selected.id, event.target.value)}
              placeholder="e.g. Mom, Dad, Emma"
              maxLength={40}
            />
          </div>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((name) => (
                <Button
                  key={name}
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setLabel(selected.id, name)}
                >
                  {name}
                </Button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save names
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleDetect()} disabled={detecting}>
              {detecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Re-find faces
            </Button>
          </div>
          {saved && <p className="text-sm text-green-700 dark:text-green-400">Names saved</p>}
        </div>
      ) : null}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
