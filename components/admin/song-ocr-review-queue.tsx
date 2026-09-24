"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Check, ChevronDown, ChevronUp, Loader2, RefreshCw, SkipForward } from "lucide-react"

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
type OcrVerse = { index: number; text: string; lines?: string[] }

export function SongOcrReviewQueue({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast()
  const [items, setItems] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pages, setPages] = useState<OcrPage[]>([])
  const [verses, setVerses] = useState<OcrVerse[]>([])
  const [loadingText, setLoadingText] = useState(false)
  const [saving, setSaving] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const autoOpened = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    autoOpened.current = false
    try {
      const res = await fetch("/api/admin/songs/ocr-review?status=needs_review&limit=100")
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

  const openItem = useCallback(
    async (item: ReviewItem) => {
      setActiveId(item.id)
      setPages([])
      setVerses([])
      setLoadingText(true)
      try {
        const res = await fetch(`/api/admin/songs/ocr-review/${item.id}`)
        const doc = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(doc.error || "OCR JSON fetch failed")
        const v = Array.isArray(doc.verses) ? doc.verses : []
        setVerses(v)
        if (v.length > 0) {
          setPages(
            v.map((verse: OcrVerse) => ({
              index: Math.max(0, Number(verse.index) - 1),
              text: verse.text || "",
            })),
          )
        } else {
          setPages(Array.isArray(doc.pages) ? doc.pages : [])
        }
      } catch (e) {
        toast({
          title: "Could not load OCR text",
          description: e instanceof Error ? e.message : "Try again",
          variant: "destructive",
        })
      } finally {
        setLoadingText(false)
      }
    },
    [toast],
  )

  // Auto-open first item when queue loads
  useEffect(() => {
    if (loading || autoOpened.current || items.length === 0) return
    if (activeId && items.some((i) => i.id === activeId)) return
    autoOpened.current = true
    void openItem(items[0])
  }, [loading, items, activeId, openItem])

  const activeIndex = items.findIndex((i) => i.id === activeId)
  const active = activeIndex >= 0 ? items[activeIndex] : null

  const goRelative = useCallback(
    (delta: number) => {
      if (items.length === 0) return
      const idx = activeIndex < 0 ? 0 : activeIndex
      const next = items[(idx + delta + items.length) % items.length]
      if (next) void openItem(next)
    },
    [items, activeIndex, openItem],
  )

  const confirm = async (item: ReviewItem, advance: boolean) => {
    if (!canEdit) return
    setSaving(true)
    try {
      const bodyVerses =
        verses.length > 0
          ? pages.map((p, i) => ({
              index: verses[i]?.index ?? i + 1,
              text: p.text,
            }))
          : undefined
      const res = await fetch(`/api/admin/songs/ocr-review/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "confirmed",
          pages,
          verses: bodyVerses,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Save failed")
      toast({ title: "OCR confirmed", description: item.title })
      const remaining = items.filter((i) => i.id !== item.id)
      setItems(remaining)
      if (advance && remaining.length > 0) {
        const nextIdx = Math.min(activeIndex, remaining.length - 1)
        const next = remaining[Math.max(0, nextIdx)]
        setActiveId(null)
        setPages([])
        setVerses([])
        void openItem(next)
      } else {
        setActiveId(null)
        setPages([])
        setVerses([])
      }
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

  // Keyboard: j/k navigate, c/Enter confirm+next, s skip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "TEXTAREA" || tag === "INPUT") {
        if (e.key === "Escape") (e.target as HTMLElement).blur()
        return
      }
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault()
        goRelative(1)
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault()
        goRelative(-1)
      } else if (canEdit && active && (e.key === "c" || e.key === "Enter") && !saving) {
        e.preventDefault()
        void confirm(active, true)
      } else if (e.key === "s") {
        e.preventDefault()
        goRelative(1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [goRelative, canEdit, active, saving])

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">
              Needs review
              {!loading ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {items.length}
                </span>
              ) : null}
            </CardTitle>
            <Button type="button" variant="ghost" size="icon" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Low-confidence Text lyrics.{" "}
            <kbd className="rounded border px-1 text-[10px]">j</kbd>/
            <kbd className="rounded border px-1 text-[10px]">k</kbd> move ·{" "}
            <kbd className="rounded border px-1 text-[10px]">c</kbd> confirm ·{" "}
            <kbd className="rounded border px-1 text-[10px]">s</kbd> skip
          </CardDescription>
        </CardHeader>
        <CardContent ref={listRef} className="max-h-[70vh] space-y-1.5 overflow-y-auto">
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
                className={`w-full rounded-md border px-2.5 py-1.5 text-left text-sm transition ${
                  activeId === item.id ? "border-primary bg-muted/50" : "hover:bg-muted/40"
                }`}
              >
                <div className="font-medium leading-snug line-clamp-2">{item.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="truncate">{item.pack_name}</span>
                  <Badge variant="outline" className="shrink-0">
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
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">
                {active ? active.title : "Select a song"}
              </CardTitle>
              <CardDescription className="mt-1">
                {active
                  ? "Edit if needed, then Confirm. Slides stay on the PDF; Text mode uses this."
                  : "Low-confidence crops land here for a human pass."}
              </CardDescription>
            </div>
            {active ? (
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => goRelative(-1)}
                  disabled={items.length < 2}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => goRelative(1)}
                  disabled={items.length < 2}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!active ? null : (
            <>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <a
                  href={active.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Open PDF slides
                </a>
                {activeIndex >= 0 ? (
                  <span className="text-muted-foreground">
                    {activeIndex + 1} / {items.length}
                  </span>
                ) : null}
              </div>
              {loadingText ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading OCR text…
                </div>
              ) : pages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No page text yet.</p>
              ) : (
                pages.map((page, i) => (
                  <div key={`${page.index}-${i}`} className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">
                      {verses.length > 0
                        ? `Verse ${verses[i]?.index ?? i + 1}`
                        : `Page ${page.index + 1}`}
                      {page.confidence != null
                        ? ` · ${Math.round(page.confidence * 100)}%`
                        : ""}
                    </div>
                    <Textarea
                      value={page.text || ""}
                      rows={Math.min(10, Math.max(3, (page.text || "").split("\n").length + 1))}
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
              {canEdit && !loadingText ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => active && void confirm(active, true)}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Confirm & next
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => active && void confirm(active, false)}
                    disabled={saving}
                  >
                    Confirm only
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => goRelative(1)}
                    disabled={items.length < 2}
                  >
                    <SkipForward className="mr-2 h-4 w-4" />
                    Skip
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
