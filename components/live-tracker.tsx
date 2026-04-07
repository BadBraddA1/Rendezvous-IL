"use client"

import { useEffect, useState } from "react"
import { Radio, Clock, ChevronRight, CalendarDays } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// ---------------------------------------------------------------------------
// Schedule data — all times in Central Time (UTC-5 during May)
// Each entry: { day, label, startH, startM, endH, endM }
// endH/endM are the start of the *next* item (or a sensible cutoff).
// ---------------------------------------------------------------------------
interface ScheduleItem {
  day: string       // "monday" | "tuesday" | ...
  date: string      // human-readable e.g. "May 4"
  time: string      // display string e.g. "1:00 – 5:15 PM"
  title: string
  startUtc: number  // ms since epoch (UTC)
  endUtc: number
}

// Helper: convert Central Time (UTC-5) to UTC ms
const ct = (month: number, day: number, year: number, h: number, m: number) =>
  Date.UTC(year, month - 1, day, h + 5, m)

const SCHEDULE: ScheduleItem[] = [
  // ── Monday May 4 ──
  { day: "monday", date: "May 4", time: "1:00 – 5:15 PM", title: "Check-in at Activity Center", startUtc: ct(5,4,2026,13,0), endUtc: ct(5,4,2026,17,15) },
  { day: "monday", date: "May 4", time: "4:00 – 5:00 PM", title: "Ice Breaker (Take-A-Hike Game)", startUtc: ct(5,4,2026,16,0), endUtc: ct(5,4,2026,17,0) },
  { day: "monday", date: "May 4", time: "5:30 PM", title: "Dinner at Lakeside Dining Room", startUtc: ct(5,4,2026,17,30), endUtc: ct(5,4,2026,19,0) },
  { day: "monday", date: "May 4", time: "7:00 PM", title: "Evening Assembly & Welcome", startUtc: ct(5,4,2026,19,0), endUtc: ct(5,4,2026,20,0) },
  { day: "monday", date: "May 4", time: "8:00 PM", title: "Black-light Dodgeball & Bombardment", startUtc: ct(5,4,2026,20,0), endUtc: ct(5,4,2026,21,0) },
  { day: "monday", date: "May 4", time: "9:00 PM", title: "Nine Square & Knockout", startUtc: ct(5,4,2026,21,0), endUtc: ct(5,4,2026,22,30) },

  // ── Tuesday May 5 ──
  { day: "tuesday", date: "May 5", time: "7:30 AM", title: "Breakfast at Lakeside Dining Room", startUtc: ct(5,5,2026,7,30), endUtc: ct(5,5,2026,9,0) },
  { day: "tuesday", date: "May 5", time: "9:00 AM", title: "Morning Assembly & Announcements", startUtc: ct(5,5,2026,9,0), endUtc: ct(5,5,2026,10,0) },
  { day: "tuesday", date: "May 5", time: "10:00 AM", title: "Young Adult & Mom's Sessions", startUtc: ct(5,5,2026,10,0), endUtc: ct(5,5,2026,12,0) },
  { day: "tuesday", date: "May 5", time: "12:00 PM", title: "Lunch at Lakeside Dining Room", startUtc: ct(5,5,2026,12,0), endUtc: ct(5,5,2026,13,30) },
  { day: "tuesday", date: "May 5", time: "1:30 PM", title: "Archery, Obstacle Course & Rope Games", startUtc: ct(5,5,2026,13,30), endUtc: ct(5,5,2026,15,30) },
  { day: "tuesday", date: "May 5", time: "3:30 PM", title: "Kids' Movie & Human Foosball", startUtc: ct(5,5,2026,15,30), endUtc: ct(5,5,2026,17,30) },
  { day: "tuesday", date: "May 5", time: "5:30 PM", title: "Dinner at Lakeside Dining Room", startUtc: ct(5,5,2026,17,30), endUtc: ct(5,5,2026,19,0) },
  { day: "tuesday", date: "May 5", time: "7:00 PM", title: "Evening Assembly & Announcements", startUtc: ct(5,5,2026,19,0), endUtc: ct(5,5,2026,20,0) },
  { day: "tuesday", date: "May 5", time: "8:00 PM", title: "Main Gym Time & Table Games", startUtc: ct(5,5,2026,20,0), endUtc: ct(5,5,2026,22,0) },
  { day: "tuesday", date: "May 5", time: "8:00 – 10:00 PM", title: "Indoor Pool Time (females)", startUtc: ct(5,5,2026,20,0), endUtc: ct(5,5,2026,22,0) },

  // ── Wednesday May 6 ──
  { day: "wednesday", date: "May 6", time: "7:30 AM", title: "Breakfast at Lakeside Dining Room", startUtc: ct(5,6,2026,7,30), endUtc: ct(5,6,2026,9,0) },
  { day: "wednesday", date: "May 6", time: "9:00 AM", title: "Morning Assembly & Group Picture", startUtc: ct(5,6,2026,9,0), endUtc: ct(5,6,2026,10,0) },
  { day: "wednesday", date: "May 6", time: "10:00 AM", title: "Dad's Session & Free Time", startUtc: ct(5,6,2026,10,0), endUtc: ct(5,6,2026,12,0) },
  { day: "wednesday", date: "May 6", time: "12:00 PM", title: "Lunch at Lakeside Dining Room", startUtc: ct(5,6,2026,12,0), endUtc: ct(5,6,2026,13,30) },
  { day: "wednesday", date: "May 6", time: "1:30 PM", title: "Kickball", startUtc: ct(5,6,2026,13,30), endUtc: ct(5,6,2026,14,30) },
  { day: "wednesday", date: "May 6", time: "2:30 PM", title: "Scrabble Tournament & Gaga Ball", startUtc: ct(5,6,2026,14,30), endUtc: ct(5,6,2026,15,30) },
  { day: "wednesday", date: "May 6", time: "3:30 PM", title: "Kids' Movie & Craft / Disc Golf", startUtc: ct(5,6,2026,15,30), endUtc: ct(5,6,2026,17,30) },
  { day: "wednesday", date: "May 6", time: "5:30 PM", title: "Dinner at Lakeside Dining Room", startUtc: ct(5,6,2026,17,30), endUtc: ct(5,6,2026,19,0) },
  { day: "wednesday", date: "May 6", time: "7:00 PM", title: "Evening Assembly & Announcements", startUtc: ct(5,6,2026,19,0), endUtc: ct(5,6,2026,20,0) },
  { day: "wednesday", date: "May 6", time: "8:00 PM", title: "Main Gym Time & Table Games", startUtc: ct(5,6,2026,20,0), endUtc: ct(5,6,2026,22,0) },
  { day: "wednesday", date: "May 6", time: "8:00 – 10:00 PM", title: "Indoor Pool Time (males)", startUtc: ct(5,6,2026,20,0), endUtc: ct(5,6,2026,22,0) },

  // ── Thursday May 7 ──
  { day: "thursday", date: "May 7", time: "7:30 AM", title: "Breakfast at Lakeside Dining Room", startUtc: ct(5,7,2026,7,30), endUtc: ct(5,7,2026,9,0) },
  { day: "thursday", date: "May 7", time: "9:00 AM", title: "Morning Assembly & Announcements", startUtc: ct(5,7,2026,9,0), endUtc: ct(5,7,2026,10,0) },
  { day: "thursday", date: "May 7", time: "10:00 AM", title: "Bible Bowl", startUtc: ct(5,7,2026,10,0), endUtc: ct(5,7,2026,10,20) },
  { day: "thursday", date: "May 7", time: "10:20 AM", title: "Ping Pong Tournament", startUtc: ct(5,7,2026,10,20), endUtc: ct(5,7,2026,12,0) },
  { day: "thursday", date: "May 7", time: "12:00 PM", title: "Lunch at Lakeside Dining Room", startUtc: ct(5,7,2026,12,0), endUtc: ct(5,7,2026,13,30) },
  { day: "thursday", date: "May 7", time: "1:30 – 3:30 PM", title: "Paddle Boats & Canoes", startUtc: ct(5,7,2026,13,30), endUtc: ct(5,7,2026,15,30) },
  { day: "thursday", date: "May 7", time: "3:30 PM", title: "Billiards & Air Hockey Tournaments", startUtc: ct(5,7,2026,15,30), endUtc: ct(5,7,2026,17,30) },
  { day: "thursday", date: "May 7", time: "5:30 PM", title: "Cookout by the Lake", startUtc: ct(5,7,2026,17,30), endUtc: ct(5,7,2026,18,30) },
  { day: "thursday", date: "May 7", time: "6:30 PM", title: "Hayrides", startUtc: ct(5,7,2026,18,30), endUtc: ct(5,7,2026,19,0) },
  { day: "thursday", date: "May 7", time: "7:00 PM", title: "Evening Assembly at the Bonfire", startUtc: ct(5,7,2026,19,0), endUtc: ct(5,7,2026,20,0) },
  { day: "thursday", date: "May 7", time: "8:00 PM", title: "Glow-in-the-Dark Capture the Flag", startUtc: ct(5,7,2026,20,0), endUtc: ct(5,7,2026,21,0) },
  { day: "thursday", date: "May 7", time: "9:00 PM", title: "Adult/Teen Volleyball", startUtc: ct(5,7,2026,21,0), endUtc: ct(5,7,2026,22,30) },

  // ── Friday May 8 ──
  { day: "friday", date: "May 8", time: "7:30 AM", title: "Breakfast at Lakeside Dining Room", startUtc: ct(5,8,2026,7,30), endUtc: ct(5,8,2026,9,0) },
  { day: "friday", date: "May 8", time: "9:00 AM", title: "Morning Assembly & Bible Bowl Awards", startUtc: ct(5,8,2026,9,0), endUtc: ct(5,8,2026,10,30) },
  { day: "friday", date: "May 8", time: "10:30 AM", title: "Pack Up & Clean Up Lodging Areas", startUtc: ct(5,8,2026,10,30), endUtc: ct(5,8,2026,12,0) },
  { day: "friday", date: "May 8", time: "12:00 PM", title: "Lunch & Depart for Home", startUtc: ct(5,8,2026,12,0), endUtc: ct(5,8,2026,13,30) },
  { day: "friday", date: "May 8", time: "1:30 PM", title: "Add-on: Indoor Climbing Tower", startUtc: ct(5,8,2026,13,30), endUtc: ct(5,8,2026,15,0) },
]

const EVENT_START = ct(5, 4, 2026, 13, 0)
const EVENT_END   = ct(5, 8, 2026, 15, 0)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getCurrentAndNext(now: number): { current: ScheduleItem | null; next: ScheduleItem | null } {
  const sorted = [...SCHEDULE].sort((a, b) => a.startUtc - b.startUtc)
  let current: ScheduleItem | null = null
  let next: ScheduleItem | null = null

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]
    if (now >= item.startUtc && now < item.endUtc) {
      current = item
      // find the next item that starts after this one
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].startUtc > now) {
          next = sorted[j]
          break
        }
      }
      break
    }
  }

  // Between items: find what's coming next
  if (!current) {
    for (const item of sorted) {
      if (item.startUtc > now) {
        next = item
        break
      }
    }
  }

  return { current, next }
}

function formatTimeUntil(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function LiveTracker() {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // SSR / hydration guard
  if (now === null) {
    return (
      <div className="rounded-xl border bg-card p-5 animate-pulse">
        <div className="h-6 w-48 rounded bg-muted mb-3" />
        <div className="h-4 w-64 rounded bg-muted" />
      </div>
    )
  }

  const isLive = now >= EVENT_START && now < EVENT_END

  // ── Not yet live: show nothing (countdown was here before — now removed) ──
  if (!isLive) {
    const msUntil = EVENT_START - now
    const days  = Math.floor(msUntil / (1000 * 60 * 60 * 24))
    const hours = Math.floor((msUntil / (1000 * 60 * 60)) % 24)
    const mins  = Math.floor((msUntil / (1000 * 60)) % 60)
    const secs  = Math.floor((msUntil / 1000) % 60)

    if (now >= EVENT_END) {
      return (
        <div className="flex items-center gap-3 rounded-xl border bg-card px-5 py-4">
          <CalendarDays className="h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            Rendezvous 2026 has concluded. See you next year!
          </p>
        </div>
      )
    }

    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Event starts in</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { v: days,  l: "Days" },
            { v: hours, l: "Hours" },
            { v: mins,  l: "Min" },
            { v: secs,  l: "Sec" },
          ].map(({ v, l }) => (
            <div key={l} className="flex min-w-[56px] flex-col items-center rounded-lg border bg-background px-3 py-2">
              <span className="text-2xl font-bold tabular-nums leading-none">{String(v).padStart(2, "0")}</span>
              <span className="mt-1 text-[11px] text-muted-foreground">{l}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">May 4, 2026 at 1:00 PM Central Time</p>
      </div>
    )
  }

  // ── Live ──
  const { current, next } = getCurrentAndNext(now)

  return (
    <div className="overflow-hidden rounded-xl border-2 border-green-500/40 bg-card shadow-sm">
      {/* Header bar */}
      <div className="flex items-center gap-2 border-b border-green-500/20 bg-green-500/10 px-4 py-2.5">
        <Radio className="h-4 w-4 animate-pulse text-green-600" />
        <span className="text-xs font-bold uppercase tracking-widest text-green-700 dark:text-green-400">
          Rendezvous is Live
        </span>
        <Badge className="ml-auto rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white">
          HAPPENING NOW
        </Badge>
      </div>

      <div className="grid gap-px bg-border sm:grid-cols-2">
        {/* Now */}
        <div className="bg-card p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400">
            Now
          </p>
          {current ? (
            <>
              <p className="text-base font-semibold leading-snug text-foreground">{current.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{current.time} &middot; {current.date}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" />
                <span>
                  Ends in{" "}
                  <span className="tabular-nums font-medium text-foreground">
                    {formatTimeUntil(current.endUtc - now)}
                  </span>
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Between scheduled activities — enjoy free time!</p>
          )}
        </div>

        {/* Up Next */}
        <div className="bg-card p-4">
          <p className="mb-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            <ChevronRight className="h-3 w-3" />
            Up Next
          </p>
          {next ? (
            <>
              <p className="text-base font-semibold leading-snug text-foreground">{next.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{next.time} &middot; {next.date}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" />
                <span>
                  Starts in{" "}
                  <span className="tabular-nums font-medium text-foreground">
                    {formatTimeUntil(next.startUtc - now)}
                  </span>
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">That&apos;s the last activity — safe travels!</p>
          )}
        </div>
      </div>
    </div>
  )
}
