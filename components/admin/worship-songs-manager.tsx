"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  DEFAULT_REGISTRATION_EVENT_YEAR,
  REGISTRATION_EVENT_YEARS,
  registrationYearOptionLabel,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"

type SongRow = {
  song_pack_item_id: string
  title: string
  versesLabel: string
  note?: string | null
}

type InboxRow = {
  id: string
  volunteer_signup_id: number
  volunteer_name: string
  volunteer_type: string
  assigned_date: string | null
  time_slot: string | null
  prayer_type: string | null
  note: string | null
  updated_at: string
  songs: SongRow[]
}

export function WorshipSongsManager() {
  const { toast } = useToast()
  const [year, setYear] = useState<RegistrationEventYear>(DEFAULT_REGISTRATION_EVENT_YEAR)
  const [items, setItems] = useState<InboxRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/worship-songs?year=${year}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setItems(data.items ?? [])
    } catch (error) {
      toast({
        title: "Could not load song sets",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [year, toast])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="admin-toolbar flex flex-wrap items-center gap-2">
        <label className="text-sm text-muted-foreground" htmlFor="worship-songs-year">
          Year
        </label>
        <select
          id="worship-songs-year"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={year}
          onChange={(e) => setYear(Number(e.target.value) as RegistrationEventYear)}
        >
          {REGISTRATION_EVENT_YEARS.map((y) => (
            <option key={y} value={y}>
              {registrationYearOptionLabel(y)}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No song sets submitted yet for {year}.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((row) => (
            <li
              key={row.id}
              className="rounded-md border border-border px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">
                  {row.volunteer_name}
                  {row.prayer_type ? ` (Group ${row.prayer_type})` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[row.assigned_date, row.time_slot].filter(Boolean).join(" · ")}
                </p>
              </div>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                {row.songs.map((song) => (
                  <li key={song.song_pack_item_id}>
                    <span className="font-medium">{song.title}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {song.versesLabel}
                    </span>
                    {song.note ? (
                      <span className="text-muted-foreground"> — {song.note}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
              {row.note ? (
                <p className="mt-2 text-xs text-muted-foreground">Note: {row.note}</p>
              ) : null}
              <p className="mt-1 text-[11px] text-muted-foreground">
                Updated {row.updated_at}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
