import { listSpecialAssignments, type SpecialAssignment } from "@/lib/special-assignments"
import { DEFAULT_REGISTRATION_EVENT_YEAR } from "@/lib/registration-event-years"
import { resolveVolunteerStartsAt } from "@/lib/family-volunteering"
import { getChicagoWallClock } from "@/lib/live-updates/chicago-time"

export type OnDutyAssignment = {
  id: number
  activity: string
  person: string | null
  timeLabel: string | null
  date: string | null
  notes: string | null
  /** Minutes from now until start; negative = already started / all-day. */
  startsInMinutes: number | null
}

function chicagoDateString(wall: Date): string {
  const y = wall.getFullYear()
  const m = String(wall.getMonth() + 1).padStart(2, "0")
  const d = String(wall.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number)
  const dt = new Date(y, m - 1, d + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

function toOnDuty(row: SpecialAssignment, nowMs: number): OnDutyAssignment {
  const person = row.assigned_name?.trim() || null
  const startsAt = resolveVolunteerStartsAt(row.assigned_date, row.time_slot)
  let startsInMinutes: number | null = null
  if (startsAt) {
    const startMs = new Date(startsAt).getTime()
    if (!Number.isNaN(startMs)) {
      startsInMinutes = Math.round((startMs - nowMs) / 60_000)
    }
  }
  return {
    id: row.id,
    activity: row.activity_name,
    person,
    timeLabel: row.time_slot?.trim() || null,
    date: row.assigned_date,
    notes: row.notes,
    startsInMinutes,
  }
}

/**
 * Special assignments for the TV board: today (and tomorrow morning if today is empty),
 * preferring named people, then open slots so staff still see what's booked.
 */
export async function fetchOnDutyAssignments(
  eventYear: number = DEFAULT_REGISTRATION_EVENT_YEAR,
  now: Date = new Date(),
): Promise<OnDutyAssignment[]> {
  const wall = getChicagoWallClock(now)
  const today = chicagoDateString(wall)
  const tomorrow = addDays(today, 1)
  const nowMs = now.getTime()

  const all = await listSpecialAssignments(eventYear)
  const forDay = (iso: string) =>
    all
      .filter((row) => row.assigned_date === iso)
      .map((row) => toOnDuty(row, nowMs))
      .sort((a, b) => {
        const am = a.startsInMinutes ?? 99999
        const bm = b.startsInMinutes ?? 99999
        if (am !== bm) return am - bm
        return a.activity.localeCompare(b.activity)
      })

  let rows = forDay(today)
  if (rows.length === 0) {
    rows = forDay(tomorrow)
  }

  // Drop past-day leftovers that already finished more than 90 minutes ago
  // when we have a parseable start (keeps evening boards from showing morning-only).
  const filtered = rows.filter((row) => {
    if (row.startsInMinutes == null) return true
    return row.startsInMinutes > -90
  })

  return filtered.length > 0 ? filtered : rows
}

export function hasOnDutyData(assignments: OnDutyAssignment[] | null | undefined): boolean {
  return (assignments?.length ?? 0) > 0
}
