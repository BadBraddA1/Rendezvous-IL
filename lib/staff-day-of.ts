import { sql } from "@/lib/db"
import { effectiveEventDate, listScheduleEvents } from "@/lib/event-schedule"
import { parseTimeString } from "@/lib/schedule-data"
import { DEFAULT_REGISTRATION_EVENT_YEAR } from "@/lib/registration-event-years"

export type StaffDayOfPayload = {
  eventYear: number
  checkedIn: number
  notCheckedIn: number
  totalRegistrations: number
  activeAnnouncements: number
  nextEvent: {
    id: number
    time: string
    title: string
    location: string | null
    day: string
    startsAt: string | null
  } | null
  updatedAt: string
}

function chicagoOffsetForDate(isoDate: string): string {
  const month = Number(isoDate.slice(5, 7))
  return month >= 3 && month <= 10 ? "-05:00" : "-06:00"
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

/**
 * Live desk stats for staff day-of home (check-in uses `registrations`).
 */
export async function getStaffDayOf(
  eventYear = DEFAULT_REGISTRATION_EVENT_YEAR,
): Promise<StaffDayOfPayload> {
  // Prefer year-scoped rows; if empty (legacy data), fall back to all registrations.
  let [checkInStats] = await sql`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN checked_in = 1 OR checked_in = true THEN 1 ELSE 0 END) as checked_in
    FROM registrations
    WHERE event_year = ${eventYear}
  `

  let total = Number(checkInStats?.total ?? 0)
  let checkedIn = Number(checkInStats?.checked_in ?? 0)

  if (total === 0) {
    ;[checkInStats] = await sql`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN checked_in = 1 OR checked_in = true THEN 1 ELSE 0 END) as checked_in
      FROM registrations
    `
    total = Number(checkInStats?.total ?? 0)
    checkedIn = Number(checkInStats?.checked_in ?? 0)
  }

  const [ann] = await sql`
    SELECT COUNT(*) as count FROM announcements WHERE is_active = 1 OR is_active = true
  `

  const events = await listScheduleEvents(eventYear)
  const now = Date.now()
  let nextEvent: StaffDayOfPayload["nextEvent"] = null

  for (const event of events) {
    const isoDate = effectiveEventDate(event, eventYear)
    if (!isoDate) continue
    let startHour = 0
    let startMinute = 0
    try {
      const parsed = parseTimeString(event.time)
      startHour = parsed.startHour
      startMinute = parsed.startMinute
    } catch {
      continue
    }
    const startsAt = `${isoDate}T${pad2(startHour)}:${pad2(startMinute)}:00${chicagoOffsetForDate(isoDate)}`
    const startMs = new Date(startsAt).getTime()
    if (Number.isNaN(startMs) || startMs < now - 30 * 60 * 1000) continue
    nextEvent = {
      id: event.id,
      time: event.time,
      title: event.title,
      location: event.location,
      day: event.day,
      startsAt,
    }
    break
  }

  return {
    eventYear,
    checkedIn,
    notCheckedIn: Math.max(0, total - checkedIn),
    totalRegistrations: total,
    activeAnnouncements: Number(ann?.count ?? 0),
    nextEvent,
    updatedAt: new Date().toISOString(),
  }
}
