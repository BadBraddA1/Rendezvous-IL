import { NextResponse } from "next/server"
import { buildLuItems, getPublicSchedule, scheduleDayDates } from "@/lib/event-schedule"

export const dynamic = "force-dynamic"

const EVENT_YEAR = 2027

/** Public schedule JSON for native clients (iOS/Android apps). */
export async function GET() {
  const { days } = await getPublicSchedule(EVENT_YEAR)

  return NextResponse.json(
    {
      year: EVENT_YEAR,
      dateRange: "May 3–7, 2027",
      location: "Lake Williamson Christian Center, Carlinville, IL",
      draftNotice: "Based on the 2026 schedule — may change slightly for 2027",
      // Same shape the apps already parse (date = short label like "May 3"),
      // with the interactive extras included additively.
      days: days.map((day) => ({
        day: day.day,
        date: day.dateLabel,
        color: day.color,
        events: day.events,
      })),
      dayDates: scheduleDayDates(EVENT_YEAR),
      luItems: buildLuItems(days),
    },
    {
      headers: {
        // Editable now, so don't cache for long — but keep the TV/app polling cheap.
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
      },
    },
  )
}
