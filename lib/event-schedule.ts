import { sql, type SqlRow } from "@/lib/db"
import {
  scheduleData,
  parseTimeString,
  detectIsMeal,
  formatTimeForDisplay,
  type LUScheduleItem,
} from "@/lib/schedule-data"

// ---------------------------------------------------------------------------
// Admin-editable event schedule.
//
// Rows live in `schedule_events`, keyed by event year. When a year has no rows
// (nobody has seeded/edited it yet) every consumer falls back to the static
// `lib/schedule-data.ts` list, enriched with the same interactive metadata the
// seeder would produce — so the public page renders identically either way.
// ---------------------------------------------------------------------------

export const SCHEDULE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const
export type ScheduleDayName = (typeof SCHEDULE_DAYS)[number]

export const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const
export const VOLUNTEER_SLOTS = ["Morning Devotion", "Evening Devotion"] as const

/** Map location ids the venue map understands (see components/schedule-map). */
export const SCHEDULE_LOCATION_IDS = [
  "activities-center",
  "lakeside-dining",
  "bonfire-site",
  "archery",
  "human-foosball",
  "gaga-ball",
  "disc-golf",
  "rec-field-kickball",
  "beachfront",
] as const

export type ScheduleEventRow = {
  id: number
  event_year: number
  day: ScheduleDayName
  sort_order: number
  time: string
  title: string
  location: string | null
  note: string | null
  location_id: string | null
  meal_type: string | null
  volunteer_slot: string | null
  link_href: string | null
  show_weather: number
}

export type ScheduleEventInput = {
  day: ScheduleDayName
  time: string
  title: string
  location: string | null
  note: string | null
  locationId: string | null
  mealType: string | null
  volunteerSlot: string | null
  linkHref: string | null
  showWeather: boolean
}

/** One event as rendered publicly (web page, print, PDF, JSON API). */
export type PublicScheduleEvent = {
  time: string
  title: string
  location?: string
  note?: string
  locationId?: string
  mealType?: string
  volunteerSlot?: string
  linkHref?: string
  showWeather?: boolean
}

export type PublicScheduleDay = {
  day: ScheduleDayName
  /** ISO date, e.g. "2027-05-03" */
  date: string
  /** Short label, e.g. "May 3" */
  dateLabel: string
  /** Badge color used on the print page */
  color: "secondary" | "primary" | "foreground"
  events: PublicScheduleEvent[]
}

const EVENT_MONDAY: Record<number, string> = {
  2027: "2027-05-03",
  2026: "2026-05-04",
}

const DAY_COLORS: PublicScheduleDay["color"][] = [
  "secondary",
  "primary",
  "foreground",
  "primary",
  "secondary",
]

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function scheduleDayDates(year: number): Record<ScheduleDayName, string> {
  const monday = EVENT_MONDAY[year] ?? EVENT_MONDAY[2027]
  const [y, m, d] = monday.split("-").map(Number)
  const out = {} as Record<ScheduleDayName, string>
  SCHEDULE_DAYS.forEach((day, index) => {
    const date = new Date(Date.UTC(y, m - 1, d + index))
    out[day] = date.toISOString().slice(0, 10)
  })
  return out
}

function dateLabelFromIso(iso: string): string {
  const [, m, d] = iso.split("-").map(Number)
  return `${MONTH_NAMES[m - 1]} ${d}`
}

// ---------------------------------------------------------------------------
// Enrichment heuristics — used by the seeder and by the static fallback so the
// interactive extras (map pins, meal menus, volunteer slots, weather) show up
// even before an admin has ever touched the editor.
// ---------------------------------------------------------------------------

const LOCATION_ID_PATTERNS: { pattern: RegExp; locationId: string }[] = [
  { pattern: /Activity Center|AC Room|AC\)|AC Ping Pong/i, locationId: "activities-center" },
  { pattern: /Lakeside Dining Room/i, locationId: "lakeside-dining" },
  { pattern: /bonfire/i, locationId: "bonfire-site" },
  { pattern: /Archery/i, locationId: "archery" },
  { pattern: /Human Foosball/i, locationId: "human-foosball" },
  { pattern: /GaGa Ball|Gaga Ball|9 Square|Nine Square/i, locationId: "gaga-ball" },
  { pattern: /Disc golf/i, locationId: "disc-golf" },
  { pattern: /Rec Field|Kickball|Capture the Flag/i, locationId: "rec-field-kickball" },
  { pattern: /Beachfront/i, locationId: "beachfront" },
]

function inferLocationId(location: string | undefined, title: string): string | null {
  const haystack = `${location ?? ""} ${title}`
  for (const { pattern, locationId } of LOCATION_ID_PATTERNS) {
    if (pattern.test(haystack)) return locationId
  }
  return null
}

function inferMealType(title: string): string | null {
  if (/\bbreakfast\b/i.test(title)) return "breakfast"
  if (/\blunch\b/i.test(title)) return "lunch"
  if (/\b(dinner|cookout)\b/i.test(title)) return "dinner"
  return null
}

function inferVolunteerSlot(title: string): string | null {
  if (/morning assembly/i.test(title)) return "Morning Devotion"
  if (/evening assembly/i.test(title)) return "Evening Devotion"
  return null
}

function inferLinkHref(title: string): string | null {
  if (/scrabble/i.test(title)) return "/scrabble"
  if (/bible bowl(?! awards)/i.test(title) && !/awards/i.test(title)) return "/biblebowl"
  return null
}

const OUTDOOR_PATTERN =
  /outdoor|rec field|beachfront|bonfire|lake|archery|foosball|kickball|gaga|disc golf|capture the flag|hayride|cookout|paddle|canoe|obstacle/i

function inferShowWeather(title: string, location: string | undefined, time: string): boolean {
  if (!OUTDOOR_PATTERN.test(`${title} ${location ?? ""}`)) return false
  try {
    const { startHour } = parseTimeString(time)
    return startHour >= 12 // only afternoon/evening outdoor events get the forecast chip
  } catch {
    return false
  }
}

function enrichStaticEvent(event: {
  time: string
  title: string
  location?: string
  note?: string
}): PublicScheduleEvent {
  const locationId = inferLocationId(event.location, event.title)
  const mealType = inferMealType(event.title)
  const volunteerSlot = inferVolunteerSlot(event.title)
  const linkHref = inferLinkHref(event.title)
  const showWeather = inferShowWeather(event.title, event.location, event.time)
  return {
    time: event.time,
    title: event.title,
    location: event.location,
    note: event.note,
    locationId: locationId ?? undefined,
    mealType: mealType ?? undefined,
    volunteerSlot: volunteerSlot ?? undefined,
    linkHref: linkHref ?? undefined,
    showWeather: showWeather || undefined,
  }
}

/** The static schedule enriched with interactive metadata, in public shape. */
export function staticPublicDays(year: number): PublicScheduleDay[] {
  const dates = scheduleDayDates(year)
  return scheduleData.map((day, index) => {
    const dayName = day.day as ScheduleDayName
    const iso = dates[dayName]
    return {
      day: dayName,
      date: iso,
      dateLabel: dateLabelFromIso(iso),
      color: DAY_COLORS[index % DAY_COLORS.length],
      events: day.events.map(enrichStaticEvent),
    }
  })
}

/** Validate an admin API request body into a ScheduleEventInput (null = invalid). */
export function parseScheduleEventBody(body: Record<string, unknown>): ScheduleEventInput | null {
  const day = typeof body.day === "string" ? body.day : ""
  const time = typeof body.time === "string" ? body.time.trim() : ""
  const title = typeof body.title === "string" ? body.title.trim() : ""
  if (!SCHEDULE_DAYS.includes(day as ScheduleDayName) || !time || !title) return null

  const str = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null

  return {
    day: day as ScheduleDayName,
    time,
    title,
    location: str(body.location),
    note: str(body.note),
    locationId: str(body.locationId),
    mealType: str(body.mealType),
    volunteerSlot: str(body.volunteerSlot),
    linkHref: str(body.linkHref),
    showWeather: Boolean(body.showWeather),
  }
}

// ---------------------------------------------------------------------------
// Table + CRUD
// ---------------------------------------------------------------------------

let tableEnsured = false

export async function ensureScheduleEventsTable(): Promise<void> {
  if (tableEnsured) return
  await sql`
    CREATE TABLE IF NOT EXISTS schedule_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_year INTEGER NOT NULL,
      day TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      time TEXT NOT NULL,
      title TEXT NOT NULL,
      location TEXT,
      note TEXT,
      location_id TEXT,
      meal_type TEXT,
      volunteer_slot TEXT,
      link_href TEXT,
      show_weather INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `
  tableEnsured = true
}

const DAY_ORDER_SQL_INDEX: Record<ScheduleDayName, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
}

function sortRows(rows: SqlRow[]): ScheduleEventRow[] {
  return (rows as unknown as ScheduleEventRow[]).sort((a, b) => {
    const dayDiff =
      (DAY_ORDER_SQL_INDEX[a.day] ?? 99) - (DAY_ORDER_SQL_INDEX[b.day] ?? 99)
    if (dayDiff !== 0) return dayDiff
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.id - b.id
  })
}

export async function listScheduleEvents(year: number): Promise<ScheduleEventRow[]> {
  await ensureScheduleEventsTable()
  const rows = await sql`
    SELECT * FROM schedule_events WHERE event_year = ${year}
  `
  return sortRows(rows)
}

function normalizeInput(input: ScheduleEventInput): ScheduleEventInput {
  return {
    day: input.day,
    time: input.time.trim(),
    title: input.title.trim(),
    location: input.location?.trim() || null,
    note: input.note?.trim() || null,
    locationId: input.locationId?.trim() || null,
    mealType: input.mealType?.trim() || null,
    volunteerSlot: input.volunteerSlot?.trim() || null,
    linkHref: input.linkHref?.trim() || null,
    showWeather: Boolean(input.showWeather),
  }
}

export async function createScheduleEvent(
  input: ScheduleEventInput,
  year: number,
): Promise<void> {
  await ensureScheduleEventsTable()
  const clean = normalizeInput(input)
  const maxRows = await sql`
    SELECT COALESCE(MAX(sort_order), -1) AS max_order
    FROM schedule_events
    WHERE event_year = ${year} AND day = ${clean.day}
  `
  const nextOrder = Number(maxRows[0]?.max_order ?? -1) + 1
  await sql`
    INSERT INTO schedule_events (
      event_year, day, sort_order, time, title, location, note,
      location_id, meal_type, volunteer_slot, link_href, show_weather
    ) VALUES (
      ${year}, ${clean.day}, ${nextOrder}, ${clean.time}, ${clean.title},
      ${clean.location}, ${clean.note}, ${clean.locationId}, ${clean.mealType},
      ${clean.volunteerSlot}, ${clean.linkHref}, ${clean.showWeather ? 1 : 0}
    )
  `
}

export async function updateScheduleEvent(
  id: number,
  input: ScheduleEventInput,
): Promise<void> {
  await ensureScheduleEventsTable()
  const clean = normalizeInput(input)
  await sql`
    UPDATE schedule_events SET
      day = ${clean.day},
      time = ${clean.time},
      title = ${clean.title},
      location = ${clean.location},
      note = ${clean.note},
      location_id = ${clean.locationId},
      meal_type = ${clean.mealType},
      volunteer_slot = ${clean.volunteerSlot},
      link_href = ${clean.linkHref},
      show_weather = ${clean.showWeather ? 1 : 0},
      updated_at = datetime('now')
    WHERE id = ${id}
  `
}

export async function deleteScheduleEvent(id: number): Promise<void> {
  await ensureScheduleEventsTable()
  await sql`DELETE FROM schedule_events WHERE id = ${id}`
}

/** Persist a new order for one day's events (list of ids top-to-bottom). */
export async function reorderScheduleEvents(
  year: number,
  day: ScheduleDayName,
  orderedIds: number[],
): Promise<void> {
  await ensureScheduleEventsTable()
  for (let index = 0; index < orderedIds.length; index++) {
    await sql`
      UPDATE schedule_events
      SET sort_order = ${index}, updated_at = datetime('now')
      WHERE id = ${orderedIds[index]} AND event_year = ${year} AND day = ${day}
    `
  }
}

/**
 * Seed a year from the static schedule (with inferred metadata). No-op if the
 * year already has rows so it can't duplicate. Returns rows inserted.
 */
export async function seedScheduleEvents(year: number): Promise<number> {
  await ensureScheduleEventsTable()
  const existing = await listScheduleEvents(year)
  if (existing.length > 0) return 0

  let inserted = 0
  for (const day of staticPublicDays(year)) {
    for (let index = 0; index < day.events.length; index++) {
      const event = day.events[index]
      await sql`
        INSERT INTO schedule_events (
          event_year, day, sort_order, time, title, location, note,
          location_id, meal_type, volunteer_slot, link_href, show_weather
        ) VALUES (
          ${year}, ${day.day}, ${index}, ${event.time}, ${event.title},
          ${event.location ?? null}, ${event.note ?? null},
          ${event.locationId ?? null}, ${event.mealType ?? null},
          ${event.volunteerSlot ?? null}, ${event.linkHref ?? null},
          ${event.showWeather ? 1 : 0}
        )
      `
      inserted++
    }
  }
  return inserted
}

// ---------------------------------------------------------------------------
// Public read model
// ---------------------------------------------------------------------------

function rowToPublicEvent(row: ScheduleEventRow): PublicScheduleEvent {
  return {
    time: row.time,
    title: row.title,
    location: row.location ?? undefined,
    note: row.note ?? undefined,
    locationId: row.location_id ?? undefined,
    mealType: row.meal_type ?? undefined,
    volunteerSlot: row.volunteer_slot ?? undefined,
    linkHref: row.link_href ?? undefined,
    showWeather: row.show_weather ? true : undefined,
  }
}

/**
 * The schedule for public display: DB rows when the year has been seeded or
 * edited, otherwise the enriched static schedule. Never throws — a DB outage
 * degrades to the static fallback so the public page keeps working.
 */
export async function getPublicSchedule(
  year: number,
): Promise<{ source: "db" | "static"; days: PublicScheduleDay[] }> {
  let rows: ScheduleEventRow[] = []
  try {
    rows = await listScheduleEvents(year)
  } catch (error) {
    console.error("[event-schedule] falling back to static schedule:", error)
    return { source: "static", days: staticPublicDays(year) }
  }

  if (rows.length === 0) {
    return { source: "static", days: staticPublicDays(year) }
  }

  const dates = scheduleDayDates(year)
  const days: PublicScheduleDay[] = []
  SCHEDULE_DAYS.forEach((dayName, index) => {
    const dayRows = rows.filter((row) => row.day === dayName)
    if (dayRows.length === 0) return
    const iso = dates[dayName]
    days.push({
      day: dayName,
      date: iso,
      dateLabel: dateLabelFromIso(iso),
      color: DAY_COLORS[index % DAY_COLORS.length],
      events: dayRows.map(rowToPublicEvent),
    })
  })
  return { source: "db", days }
}

/**
 * LU (Live Updates / TV) items derived from the public schedule, including the
 * per-night "Good Night!" sign-off entries after each day's last event
 * (skipping the final day, when everyone heads home after lunch).
 */
export function buildLuItems(days: PublicScheduleDay[]): LUScheduleItem[] {
  const items: LUScheduleItem[] = []
  const lastStartByDate: Record<string, number> = {}

  for (const day of days) {
    for (const event of day.events) {
      let parsed: { startHour: number; startMinute: number; endHour?: number; endMinute?: number }
      try {
        parsed = parseTimeString(event.time)
      } catch {
        continue // unparseable times (e.g. "TBD") just don't appear on the TV
      }
      items.push({
        date: day.date,
        day: day.day,
        time: event.time,
        startHour: parsed.startHour,
        startMinute: parsed.startMinute,
        endHour: parsed.endHour,
        endMinute: parsed.endMinute,
        title: event.title,
        location: event.location,
        isMeal: detectIsMeal(event.title),
      })
      const endMinutes =
        parsed.endHour !== undefined && parsed.endMinute !== undefined
          ? parsed.endHour * 60 + parsed.endMinute
          : parsed.startHour * 60 + parsed.startMinute + 60
      lastStartByDate[day.date] = Math.max(lastStartByDate[day.date] ?? 0, endMinutes)
    }
  }

  const dayDates = days.map((day) => day.date)
  const lastDate = dayDates[dayDates.length - 1]
  for (const day of days) {
    if (day.date === lastDate) continue
    const lastEnd = lastStartByDate[day.date]
    if (lastEnd === undefined) continue
    const goodNight = Math.min(Math.max(lastEnd, 22 * 60), 23 * 60 + 30)
    const hour = Math.floor(goodNight / 60)
    const minute = goodNight % 60
    items.push({
      date: day.date,
      day: day.day,
      time: formatTimeForDisplay(hour, minute),
      startHour: hour,
      startMinute: minute,
      endHour: 23,
      endMinute: 59,
      title: "Good Night!",
      location: "See you tomorrow!",
    })
  }

  items.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute)
  })
  return items
}
