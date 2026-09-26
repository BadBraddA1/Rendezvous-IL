"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  ExternalLink,
  FileJson2,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react"

type LibraryItem = {
  id: string
  pack_id: string
  pack_name?: string
  pack_slug?: string
  book_code?: "A" | "B" | "C" | "D" | null
  book_label?: string
  page_number?: number | null
  title: string
  admin_title: string
  file_url: string
  file_type: "pdf" | "image"
  page_count: number | null
  verse_count: number | null
  ocr_url: string | null
  ocr_status: string | null
  ocr_confidence: number | null
  ocr_method: "gemini" | "other" | "none"
}

type OcrDoc = {
  verses?: { index: number; text: string; lines?: string[] }[]
  chorus?: { text?: string } | null
  pages?: { index: number; text: string }[]
  method?: string
  confidence?: number
  verse_count?: number
  status?: string
  [key: string]: unknown
}

type Filter = "all" | "missing" | "high" | "low" | "gemini"
type BookFilter = "all" | "A" | "B" | "C" | "D"

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "missing", label: "No Gemini" },
  { id: "high", label: "High vc" },
  { id: "low", label: "Low / fat" },
  { id: "gemini", label: "Gemini" },
]

const BOOKS: { id: BookFilter; label: string }[] = [
  { id: "all", label: "All books" },
  { id: "A", label: "A · SFP" },
  { id: "B", label: "B · SSOC" },
  { id: "C", label: "C · TPH" },
  { id: "D", label: "D · P&H" },
]

export function SongLibraryInspector() {
  const { toast } = useToast()
  const [q, setQ] = useState("")
  const [debouncedQ, setDebouncedQ] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [book, setBook] = useState<BookFilter>("all")
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [ocr, setOcr] = useState<OcrDoc | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [pane, setPane] = useState<"lyrics" | "json">("lyrics")

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 200)
    return () => clearTimeout(t)
  }, [q])

  // Deep-link ?song=A-957 or ?song=957
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const song = params.get("song")
    if (!song) return
    const m = song.trim().match(/^([A-Da-d])\s*[-–—]?\s*(\d{1,4})$/)
    if (m) {
      setBook(m[1]!.toUpperCase() as "A" | "B" | "C" | "D")
      setQ(m[2]!)
      setDebouncedQ(m[2]!)
    } else if (/^\d{1,4}$/.test(song.trim())) {
      setQ(song.trim())
      setDebouncedQ(song.trim())
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        filter,
        book,
        limit: "400",
      })
      if (debouncedQ) params.set("q", debouncedQ)
      const res = await fetch(`/api/admin/songs/library?${params}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to load library")
      const next = (data.items || []) as LibraryItem[]
      setItems(next)
      if (next.length === 1) {
        setActiveId(next[0]!.id)
      } else if (activeId && !next.some((i) => i.id === activeId)) {
        setActiveId(next[0]?.id ?? null)
      } else if (!activeId && next.length > 0) {
        setActiveId(next[0]!.id)
      }
    } catch (e) {
      toast({
        title: "Could not load song library",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [debouncedQ, filter, book, toast, activeId])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, filter, book])

  const active = useMemo(
    () => items.find((i) => i.id === activeId) ?? null,
    [items, activeId],
  )

  useEffect(() => {
    if (!active) {
      setOcr(null)
      setOcrError(null)
      return
    }
    let cancelled = false
    setOcrLoading(true)
    setOcrError(null)
    setOcr(null)
    void (async () => {
      try {
        const res = await fetch(`/api/admin/songs/ocr-review/${active.id}`)
        const doc = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setOcrError(doc.error || "No OCR JSON")
          setOcr(null)
          return
        }
        setOcr(doc as OcrDoc)
      } catch (e) {
        if (!cancelled) {
          setOcrError(e instanceof Error ? e.message : "OCR fetch failed")
        }
      } finally {
        if (!cancelled) setOcrLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [active])

  const verses = ocr?.verses ?? []
  const chorus = ocr?.chorus?.text?.trim() || null

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="A-446, B-12, or title"
            className="h-10 pl-9"
            aria-label="Search songs"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {BOOKS.map((b) => (
            <Button
              key={b.id}
              type="button"
              size="sm"
              variant={book === b.id ? "default" : "outline"}
              className="min-h-9"
              onClick={() => setBook(b.id)}
            >
              {b.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              type="button"
              size="sm"
              variant={filter === f.id ? "default" : "outline"}
              className="min-h-9"
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-10 min-w-10"
          onClick={() => void load()}
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid min-h-[70vh] lg:grid-cols-[280px_1fr]">
        {/* List */}
        <aside className="max-h-[70vh] overflow-y-auto border-b border-border lg:border-b-0 lg:border-r">
          <div className="sticky top-0 z-10 border-b border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
            {loading ? "Loading…" : `${items.length} songs`}
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">No matches.</p>
          ) : (
            <ul className="p-1.5">
              {items.map((item) => {
                const selected = item.id === activeId
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(item.id)}
                      className={`w-full rounded-md px-2.5 py-2 text-left text-sm transition ${
                        selected
                          ? "bg-primary/10 ring-1 ring-primary/40"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="font-medium leading-snug line-clamp-2">
                        {item.admin_title || item.title}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.book_code ? (
                          <Badge variant="outline" className="text-[10px]">
                            {item.book_code}
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className="text-[10px]">
                          {item.verse_count != null
                            ? `${item.verse_count} vr`
                            : "— vr"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {item.page_count != null
                            ? `${item.page_count} pg`
                            : "— pg"}
                        </Badge>
                        <Badge
                          variant={
                            item.ocr_method === "gemini" ? "default" : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {item.ocr_method}
                        </Badge>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        {/* Detail */}
        <div className="flex min-h-0 flex-col">
          {!active ? (
            <p className="p-6 text-sm text-muted-foreground">
              Search a page number and select a song.
            </p>
          ) : (
            <>
              <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-3 py-2.5">
                <div className="min-w-0">
                  <h3 className="text-subheading text-balance">
                    {active.admin_title || active.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {active.book_label || active.pack_name || "Song book"}
                    {active.ocr_status ? ` · ${active.ocr_status}` : ""}
                    {active.ocr_confidence != null
                      ? ` · ${Math.round(active.ocr_confidence * 100)}%`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a
                      href={active.file_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      PDF
                    </a>
                  </Button>
                  {active.ocr_url ? (
                    <Button type="button" variant="outline" size="sm" asChild>
                      <a
                        href={active.ocr_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileJson2 className="mr-1.5 h-3.5 w-3.5" />
                        JSON
                      </a>
                    </Button>
                  ) : null}
                </div>
              </header>

              <div className="grid min-h-0 flex-1 lg:grid-cols-2">
                {/* PDF preview */}
                <div className="flex min-h-[40vh] flex-col border-b border-border lg:border-b-0 lg:border-r">
                  <div className="border-b border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    PDF preview
                  </div>
                  <div className="min-h-0 flex-1 bg-muted/20">
                    {active.file_type === "pdf" ? (
                      <iframe
                        key={active.id}
                        title={`PDF ${active.title}`}
                        src={`${active.file_url}#toolbar=1&navpanes=0`}
                        className="h-full min-h-[40vh] w-full lg:min-h-[calc(70vh-5rem)]"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={active.file_url}
                        alt={active.title}
                        className="mx-auto max-h-[60vh] object-contain p-2"
                      />
                    )}
                  </div>
                </div>

                {/* Lyrics / JSON */}
                <div className="flex min-h-0 flex-col">
                  <div className="flex items-center gap-1 border-b border-border px-2 py-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={pane === "lyrics" ? "default" : "ghost"}
                      className="min-h-8"
                      onClick={() => setPane("lyrics")}
                    >
                      Lyrics
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={pane === "json" ? "default" : "ghost"}
                      className="min-h-8"
                      onClick={() => setPane("json")}
                    >
                      JSON
                    </Button>
                  </div>
                  <div className="max-h-[50vh] flex-1 overflow-y-auto p-3 lg:max-h-[calc(70vh-5rem)]">
                    {ocrLoading ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : ocrError ? (
                      <p className="text-sm text-destructive">{ocrError}</p>
                    ) : !ocr ? (
                      <p className="text-sm text-muted-foreground">No OCR payload.</p>
                    ) : pane === "json" ? (
                      <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 text-xs leading-relaxed">
                        {JSON.stringify(ocr, null, 2)}
                      </pre>
                    ) : (
                      <div className="space-y-4 text-sm">
                        {chorus ? (
                          <div className="rounded-md border border-border/80 bg-muted/30 px-3 py-2">
                            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Chorus
                            </div>
                            <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                              {chorus}
                            </p>
                          </div>
                        ) : null}
                        {verses.length > 0 ? (
                          verses.map((v) => (
                            <div key={v.index}>
                              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Verse {v.index}
                              </div>
                              <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                                {v.text}
                              </p>
                            </div>
                          ))
                        ) : Array.isArray(ocr.pages) && ocr.pages.length > 0 ? (
                          ocr.pages.map((p) => (
                            <div key={p.index}>
                              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Page {p.index + 1}
                              </div>
                              <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                                {p.text}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground">No verses in JSON.</p>
                        )}
                        {ocr.method ? (
                          <p className="text-xs text-muted-foreground">
                            method={String(ocr.method)}
                            {ocr.confidence != null
                              ? ` · conf=${ocr.confidence}`
                              : ""}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
