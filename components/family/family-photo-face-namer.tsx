"use client"

import { useEffect, useRef, useState } from "react"
import { detectFacesInBrowserImage } from "@/lib/detect-faces-browser"
import {
  faceBoxStyle,
  useFamilyPhotoLayout,
} from "@/components/family/use-family-photo-layout"
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
  /** Defaults to family self-service API. Admins pass `/api/admin/directory/families/{id}/faces`. */
  facesApiPath?: string
}

export function FamilyPhotoFaceNamer({
  photoUrl,
  initialFaces = [],
  initialSuggestions = [],
  facesApiPath = "/api/family/directory/faces",
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
  const imgRef = useRef<HTMLImageElement>(null)
  const photoLayout = useFamilyPhotoLayout(imgRef, photoUrl)
  const autoDetectAttempted = useRef(false)

  useEffect(() => {
    setFaces(initialFaces)
    setSuggestions(initialSuggestions)
    autoDetectAttempted.current = false
    if (initialFaces.length > 0) {
      setSelectedId(initialFaces.find((f) => !f.label)?.id ?? initialFaces[0]?.id ?? null)
      setLoading(false)
      autoDetectAttempted.current = true
    }
  }, [initialFaces, initialSuggestions, photoUrl])

  useEffect(() => {
    if (initialFaces.length > 0) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        const response = await fetch(facesApiPath)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Could not load faces")
        if (cancelled) return
        const next = (data.faces || []) as ManageableFace[]
        setFaces(next)
        setSuggestions((data.name_suggestions || []) as string[])
        setSelectedId(next.find((f) => !f.label)?.id ?? next[0]?.id ?? null)
        if (next.length > 0) autoDetectAttempted.current = true
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
  }, [photoUrl, initialFaces.length, facesApiPath])

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
      const response = await fetch(facesApiPath, {
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

  async function persistDetectedBoxes(
    boxes: Array<{ x: number; y: number; w: number; h: number }>,
  ): Promise<ManageableFace[]> {
    const response = await fetch(facesApiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faces: boxes }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || "Could not save face boxes")
    return (data.faces || []) as ManageableFace[]
  }

  async function handleDetect(force = false) {
    setDetecting(true)
    setError("")
    setSaved(false)
    try {
      // face-api (SSD MobileNet) in the browser — no Worker; models served from this site.
      const boxes = await detectFacesInBrowserImage(photoUrl)
      if (boxes.length === 0) {
        setError(
          "No faces found in this photo. Try a clearer front-facing group shot, then Re-find faces.",
        )
        if (force) setFaces([])
        return
      }
      const next = await persistDetectedBoxes(boxes)
      setFaces(next)
      setSelectedId(next.find((f) => !f.label)?.id ?? next[0]?.id ?? null)
      const suggestionsRes = await fetch(facesApiPath)
      const suggestionsData = await suggestionsRes.json()
      if (suggestionsRes.ok) {
        setSuggestions((suggestionsData.name_suggestions || []) as string[])
      }
    } catch (detectError) {
      setError(detectError instanceof Error ? detectError.message : "Could not find faces")
    } finally {
      setDetecting(false)
    }
  }

  // Auto-run MediaPipe when we have a photo but no boxes yet (upload no longer runs Gemini).
  useEffect(() => {
    if (loading || faces.length > 0 || detecting || autoDetectAttempted.current) return
    if (!photoUrl) return
    autoDetectAttempted.current = true
    void handleDetect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot when empty after load
  }, [loading, photoUrl, faces.length, detecting])

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
          in the directory. First find may take a few seconds while the face model loads.
        </p>
      </div>

      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl border bg-muted">
        {/* Intrinsic size so face % boxes match the pixels (no object-cover crop). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={photoUrl}
          alt="Family photo for naming faces"
          className="block h-auto w-full"
        />
        <FamilyPhotoFaceLabels faces={faces} layout={photoLayout} />
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
            style={faceBoxStyle(face, photoLayout)}
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
          <Button type="button" variant="outline" onClick={() => void handleDetect(true)} disabled={detecting}>
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
            <Button type="button" variant="outline" onClick={() => void handleDetect(true)} disabled={detecting}>
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
