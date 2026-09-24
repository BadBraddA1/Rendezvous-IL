"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
}

type SongPick = {
  song_pack_item_id: string
  pack_id: string
  title: string
  verses: { mode: "all" } | { mode: "list"; verses: number[] }
  note?: string | null
}

export function WorshipSongSetEditor({
  signupId,
  eventYear,
}: {
  signupId: number
  eventYear: number
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [volunteerName, setVolunteerName] = useState("")
  const [songs, setSongs] = useState<SongPick[]>([])
  const [note, setNote] = useState("")
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
      setSongs(data.submission?.songs || [])
      setNote(data.submission?.note || "")
    } catch (e) {
      toast({
        title: "Could not load song set",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
    }, 220)
    return () => clearTimeout(t)
  }, [q, eventYear])

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
      },
    ])
    setQ("")
    setHits([])
  }

  const maxVerseOptions = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8], [])

  const toggleVerse = (index: number, verse: number) => {
    setSongs((prev) =>
      prev.map((song, i) => {
        if (i !== index) return song
        const current =
          song.verses.mode === "list" ? new Set(song.verses.verses) : new Set<number>()
        if (song.verses.mode === "all") {
          // switching from all → only this verse
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

  const setAllVerses = (index: number) => {
    setSongs((prev) =>
      prev.map((song, i) =>
        i === index ? { ...song, verses: { mode: "all" } } : song,
      ),
    )
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(
        `/api/family/volunteers/${signupId}/songs?year=${eventYear}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ songs, note: note.trim() || null }),
        },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Save failed")
      setSongs(data.submission?.songs || songs)
      toast({ title: "Songs submitted" })
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {volunteerName ? `For ${volunteerName}` : "Your song set"} · {eventYear}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Search the song book (page # or title), add songs, and pick which verses
          you’ll lead — e.g. 957 verses 1 and 2.
        </p>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search 957 or title…"
            className="h-11 pl-9"
            aria-label="Search songs"
          />
        </div>
        {searching ? (
          <p className="text-xs text-muted-foreground">Searching…</p>
        ) : null}
        {hits.length > 0 ? (
          <ul className="divide-y rounded-md border border-border">
            {hits.slice(0, 12).map((hit) => (
              <li key={hit.item_id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/50"
                  onClick={() => addHit(hit)}
                >
                  <span>
                    <span className="font-medium">{hit.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {hit.pack_name}
                      {hit.verse_count != null ? ` · ${hit.verse_count} vr` : ""}
                    </span>
                  </span>
                  <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="space-y-3">
        <h2 className="text-subheading">Your songs ({songs.length})</h2>
        {songs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No songs yet — search above.</p>
        ) : (
          songs.map((song, index) => (
            <div
              key={`${song.song_pack_item_id}-${index}`}
              className="space-y-2 rounded-md border border-border p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{song.title}</p>
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
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant={song.verses.mode === "all" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setAllVerses(index)}
                >
                  All
                </Badge>
                {maxVerseOptions.map((n) => {
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
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="song-set-note">
          Note (optional)
        </label>
        <Input
          id="song-set-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Slow on the chorus…"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => void save()}
          disabled={saving || songs.length === 0}
          className="min-h-11"
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
        <Button type="button" variant="outline" className="min-h-11" asChild>
          <Link href="/account">Back to account</Link>
        </Button>
      </div>
    </div>
  )
}
