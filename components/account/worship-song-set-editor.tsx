"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Search, Trash2, Plus } from "lucide-react"

type SearchHit = {
  pack_id: string
  pack_name: string
  item_id: string
  title: string
  verse_count: number | null
  sort_order?: number
}

type SongPick = {
  song_pack_item_id: string
  pack_id: string
  title: string
  verses: { mode: "all" } | { mode: "list"; verses: number[] }
  note?: string | null
  verse_count?: number | null
}

function findExactNumberHit(hits: SearchHit[], q: string): SearchHit | null {
  const n = q.trim()
  if (!/^\d{1,4}$/.test(n)) return null
  const num = Number(n)
  return (
    hits.find(
      (h) =>
        h.title.startsWith(`${n} ·`) ||
        h.title.startsWith(`A-${n} ·`) ||
        h.title.startsWith(`B-${n} ·`) ||
        h.sort_order === num,
    ) ?? null
  )
}

function versePreset(
  song: SongPick,
): "all" | "1-2" | "1-3" | "custom" {
  if (song.verses.mode === "all") return "all"
  const v = song.verses.verses
  if (v.length === 2 && v[0] === 1 && v[1] === 2) return "1-2"
  if (v.length === 3 && v[0] === 1 && v[1] === 2 && v[2] === 3) return "1-3"
  return "custom"
}

export function WorshipSongSetEditor({
  signupId,
  eventYear,
}: {
  signupId: number
  eventYear: number
}) {
  const { toast } = useToast()
  const searchRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [volunteerName, setVolunteerName] = useState("")
  const [songs, setSongs] = useState<SongPick[]>([])
  const [note, setNote] = useState("")
  const [showNote, setShowNote] = useState(false)
  const [customIndex, setCustomIndex] = useState<number | null>(null)
  const [q, setQ] = useState("")
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/family/volunteers/${signupId}/songs?year=${eventYear}`,
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not load")
      setVolunteerName(data.volunteerName || "")
      const loaded = (data.submission?.songs || []) as SongPick[]
      setSongs(loaded)
      setNote(data.submission?.note || "")
      if (data.submission?.note) setShowNote(true)
    } catch (e) {
      toast({
        title: "Could not load song set",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [signupId, eventYear, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const t = setTimeout(async () => {
      const query = q.trim()
      if (query.length < 1) {
        setHits([])
        return
      }
      setSearching(true)
      try {
        const res = await fetch(
          `/api/songs/search?q=${encodeURIComponent(query)}&year=${eventYear}`,
        )
        const data = await res.json().catch(() => ({}))
        setHits((data.results || []) as SearchHit[])
      } catch {
        setHits([])
      } finally {
        setSearching(false)
      }
    }, 180)
    return () => clearTimeout(t)
  }, [q, eventYear])

  const exactHit = useMemo(() => findExactNumberHit(hits, q), [hits, q])

  const addHit = (hit: SearchHit) => {
    if (songs.some((s) => s.song_pack_item_id === hit.item_id)) {
      toast({ title: "Already in your set" })
      return
    }
    setSongs((prev) => [
      ...prev,
      {
        song_pack_item_id: hit.item_id,
        pack_id: hit.pack_id,
        title: hit.title,
        verses: { mode: "all" },
        verse_count: hit.verse_count,
      },
    ])
    setQ("")
    setHits([])
    searchRef.current?.focus()
  }

  const tryAddFromSearch = () => {
    if (exactHit) {
      addHit(exactHit)
      return
    }
    if (hits.length === 1) {
      addHit(hits[0])
    }
  }

  const setPreset = (index: number, preset: "all" | "1-2" | "1-3") => {
    setCustomIndex(null)
    setSongs((prev) =>
      prev.map((song, i) => {
        if (i !== index) return song
        if (preset === "all") return { ...song, verses: { mode: "all" } }
        if (preset === "1-2") return { ...song, verses: { mode: "list", verses: [1, 2] } }
        return { ...song, verses: { mode: "list", verses: [1, 2, 3] } }
      }),
    )
  }

  const toggleVerse = (index: number, verse: number) => {
    setSongs((prev) =>
      prev.map((song, i) => {
        if (i !== index) return song
        const current =
          song.verses.mode === "list" ? new Set(song.verses.verses) : new Set<number>()
        if (song.verses.mode === "all") {
          return { ...song, verses: { mode: "list", verses: [verse] } }
        }
        if (current.has(verse)) current.delete(verse)
        else current.add(verse)
        const list = [...current].sort((a, b) => a - b)
        if (list.length === 0) return { ...song, verses: { mode: "all" } }
        return { ...song, verses: { mode: "list", verses: list } }
      }),
    )
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = songs.map(({ song_pack_item_id, pack_id, title, verses, note: n }) => ({
        song_pack_item_id,
        pack_id,
        title,
        verses,
        note: n,
      }))
      const res = await fetch(
        `/api/family/volunteers/${signupId}/songs?year=${eventYear}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ songs: payload, note: note.trim() || null }),
        },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Save failed")
      setSongs(data.submission?.songs || songs)
      toast({ title: "Songs submitted — you’re done" })
    } catch (e) {
      toast({
        title: "Could not submit",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    )
  }

  const readyHint =
    songs.length === 0
      ? "Type a song number (like 957), tap Add."
      : songs.length < 3
        ? `${songs.length} song${songs.length === 1 ? "" : "s"} — add more if you want, then Submit.`
        : `${songs.length} songs — tap Submit when ready.`

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {volunteerName ? `For ${volunteerName}` : "Your song set"} · {eventYear}
        </p>
        <p className="mt-1 text-base font-medium text-foreground">
          Usually 3 songs. Type the number, add it, pick verses if needed.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{readyHint}</p>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                tryAddFromSearch()
              }
            }}
            placeholder="Song number or title…"
            className="h-12 pl-9 text-base"
            inputMode="search"
            enterKeyHint="done"
            aria-label="Search songs"
          />
        </div>
        {exactHit ? (
          <Button
            type="button"
            className="h-12 w-full text-base"
            onClick={() => addHit(exactHit)}
          >
            Add {exactHit.title.split(" · ")[0]} · {exactHit.title.split(" · ").slice(1).join(" · ") || exactHit.title}
          </Button>
        ) : null}
        {searching ? (
          <p className="text-xs text-muted-foreground">Searching…</p>
        ) : null}
        {!exactHit && hits.length > 0 ? (
          <ul className="divide-y rounded-md border border-border">
            {hits.slice(0, 8).map((hit) => (
              <li key={hit.item_id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left text-base hover:bg-muted/50"
                  onClick={() => addHit(hit)}
                >
                  <span>
                    <span className="font-medium">{hit.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {hit.pack_name}
                      {hit.verse_count != null ? ` · ${hit.verse_count} verses` : ""}
                    </span>
                  </span>
                  <Plus className="h-5 w-5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="space-y-3">
        <h2 className="text-subheading">Your songs ({songs.length})</h2>
        {songs.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet — search above.</p>
        ) : (
          songs.map((song, index) => {
            const preset = versePreset(song)
            const showCustom = customIndex === index || preset === "custom"
            const maxV = Math.min(Math.max(song.verse_count ?? 6, 1), 8)
            return (
              <div
                key={`${song.song_pack_item_id}-${index}`}
                className="space-y-2 rounded-md border border-border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-medium">{song.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {song.verses.mode === "all"
                        ? "All verses"
                        : `Verses ${song.verses.verses.join(", ")}`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="min-h-10 min-w-10"
                    aria-label="Remove song"
                    onClick={() =>
                      setSongs((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["all", "All"],
                      ["1-2", "1–2"],
                      ["1-3", "1–3"],
                    ] as const
                  ).map(([key, label]) => (
                    <Badge
                      key={key}
                      variant={preset === key ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1.5 text-sm"
                      onClick={() => setPreset(index, key)}
                    >
                      {label}
                    </Badge>
                  ))}
                  <Badge
                    variant={showCustom ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1.5 text-sm"
                    onClick={() =>
                      setCustomIndex((cur) => (cur === index ? null : index))
                    }
                  >
                    Other…
                  </Badge>
                </div>
                {showCustom ? (
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: maxV }, (_, i) => i + 1).map((n) => {
                      const on =
                        song.verses.mode === "list" && song.verses.verses.includes(n)
                      return (
                        <Badge
                          key={n}
                          variant={on ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleVerse(index, n)}
                        >
                          {n}
                        </Badge>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })
        )}
      </div>

      {showNote ? (
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="song-set-note">
            Note for projection / AV (optional)
          </label>
          <Input
            id="song-set-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Slow on the chorus…"
          />
        </div>
      ) : (
        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => setShowNote(true)}
        >
          Add a note (optional)
        </button>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={() => void save()}
          disabled={saving || songs.length === 0}
          className="min-h-12 text-base"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Submit songs"
          )}
        </Button>
        <Button type="button" variant="outline" className="min-h-12" asChild>
          <Link href="/account">Back to account</Link>
        </Button>
      </div>
    </div>
  )
}
