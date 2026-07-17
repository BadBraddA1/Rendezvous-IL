import { NextResponse } from "next/server"
import {
  buildLuItems,
  buildScheduleDayDatesMap,
  getPublicSchedule,
} from "@/lib/event-schedule"
import { getScheduleMeta } from "@/lib/schedule-meta"

export const dynamic = "force-dynamic"

const EVENT_YEAR = 2027

/** Public schedule JSON for native clients (iOS/Android apps). */
export async function GET() {
  const [{ days }, meta] = await Promise.all([
    getPublicSchedule(EVENT_YEAR),
    getScheduleMeta(EVENT_YEAR),
  ])

  return NextResponse.json(
    {
      year: EVENT_YEAR,
      dateRange: meta.dateRange,
      location: meta.location,
      // Empty string hides the banner in apps (no App Store update required).
      draftNotice: meta.draftNotice,
      // Same shape the apps already parse (date = short label like "May 3"),
      // with the interactive extras included additively.
      // Custom key-date days use an ISO `day` key (unique); weekday is additive.
      days: days.map((day) => ({
        day: day.day,
        weekday: day.weekday,
        date: day.dateLabel,
        color: day.color,
        events: day.events,
      })),
      dayDates: buildScheduleDayDatesMap(EVENT_YEAR, days),
      luItems: buildLuItems(days),
    },
    {
      headers: {
        // Admin edits should show up on the next app refresh (was 5m CDN cache).
        "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=30",
      },
    },
  )
}
