"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Check, Loader2, RefreshCw } from "lucide-react"

type ReviewItem = {
  id: string
  pack_id: string
  pack_name?: string
  title: string
  file_url: string
  ocr_url: string | null
  ocr_status: string | null
  ocr_confidence: number | null
}

type OcrPage = { index: number; text: string; confidence?: number }

export function SongOcrReviewQueue({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast()
  const [items, setItems] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pages, setPages] = useState<OcrPage[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/songs/ocr-review?status=needs_review&limit=50")
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setItems(data.items || [])
    } catch (e) {
      toast({
        title: "Could not load OCR queue",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const openItem = async (item: ReviewItem) => {
    setActiveId(item.id)
    setPages([])
    if (!item.ocr_url) return
    try {
      const res = await fetch(item.ocr_url)
      if (!res.ok) throw new Error("OCR JSON fetch failed")
      const doc = await res.json()
      setPages(Array.isArray(doc.pages) ? doc.pages : [])
    } catch (e) {
      toast({
        title: "Could not load OCR text",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      })
    }
  }

  const confirm = async (item: ReviewItem) => {
    if (!canEdit) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/songs/ocr-review/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed", pages }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Save failed")
      toast({ title: "OCR confirmed", description: item.title })
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      setActiveId(null)
      setPages([])
    } catch (e) {
      toast({
        title: "Could not confirm",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const active = items.find((i) => i.id === activeId) || null

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Needs review</CardTitle>
            <Button type="button" variant="ghost" size="icon" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Lyric-band OCR below confidence — confirm or edit, then the app uses this text.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Queue is empty.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void openItem(item)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                  activeId === item.id ? "border-primary bg-muted/50" : "hover:bg-muted/40"
                }`}
              >
                <div className="font-medium leading-snug">{item.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {item.pack_name}
                  <Badge variant="outline">
                    {item.ocr_confidence != null
                      ? `${Math.round(item.ocr_confidence * 100)}%`
                      : "—"}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {active ? active.title : "Select a song"}
          </CardTitle>
          <CardDescription>
            {active
              ? "Edit lyric lines if needed, then Confirm. Slides stay on the PDF; Text mode uses this."
              : "Low-confidence crops land here for a human pass."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!active ? null : (
            <>
              <a
                href={active.file_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Open PDF slides
              </a>
              {pages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No page text yet.</p>
              ) : (
                pages.map((page, i) => (
                  <div key={page.index} className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">
                      Page {page.index + 1}
                      {page.confidence != null
                        ? ` · ${Math.round(page.confidence * 100)}%`
                        : ""}
                    </div>
                    <Textarea
                      value={page.text || ""}
                      rows={Math.min(8, Math.max(3, (page.text || "").split("\n").length + 1))}
                      onChange={(e) => {
                        const next = [...pages]
                        next[i] = { ...page, text: e.target.value }
                        setPages(next)
                      }}
                      disabled={!canEdit}
                    />
                  </div>
                ))
              )}
              {canEdit ? (
                <Button
                  type="button"
                  onClick={() => active && void confirm(active)}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Confirm text
                </Button>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
