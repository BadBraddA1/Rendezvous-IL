import { sql } from "@/lib/db"
import type { RegistrationEventYear } from "@/lib/registration-event-years"

export type ScheduleMeta = {
  /** Short range label, e.g. "May 3–7, 2027" */
  dateRange: string
  /** Venue line under the title */
  location: string
  /**
   * Optional banner under the title (apps + website).
   * Empty string = hidden everywhere — no App Store update needed.
   */
  draftNotice: string
}

const DEFAULTS: Record<number, ScheduleMeta> = {
  2026: {
    dateRange: "May 5–9, 2026",
    location: "Lake Williamson Christian Center, Carlinville, IL",
    draftNotice: "",
  },
  2027: {
    dateRange: "May 3–7, 2027",
    location: "Lake Williamson Christian Center, Carlinville, IL",
    // Cleared by default — edit in Admin → Schedule if you want a banner again.
    draftNotice: "",
  },
}

function metaKey(year: number): string {
  return `schedule_meta_${year}`
}

function defaultsFor(year: number): ScheduleMeta {
  return DEFAULTS[year] ?? {
    dateRange: String(year),
    location: "Lake Williamson Christian Center, Carlinville, IL",
    draftNotice: "",
  }
}

function parseMeta(raw: unknown, year: number): ScheduleMeta {
  const fallback = defaultsFor(year)
  if (!raw || typeof raw !== "object") return fallback
  const obj = raw as Record<string, unknown>
  return {
    dateRange:
      typeof obj.dateRange === "string" && obj.dateRange.trim()
        ? obj.dateRange.trim()
        : fallback.dateRange,
    location:
      typeof obj.location === "string" && obj.location.trim()
        ? obj.location.trim()
        : fallback.location,
    draftNotice: typeof obj.draftNotice === "string" ? obj.draftNotice.trim() : fallback.draftNotice,
  }
}

export async function getScheduleMeta(year: RegistrationEventYear | number): Promise<ScheduleMeta> {
  const y = Number(year)
  try {
    const [row] = await sql`
      SELECT value FROM app_settings WHERE key = ${metaKey(y)}
    `
    if (!row?.value) return defaultsFor(y)
    try {
      return parseMeta(JSON.parse(String(row.value)), y)
    } catch {
      return defaultsFor(y)
    }
  } catch {
    return defaultsFor(y)
  }
}

export async function setScheduleMeta(
  year: RegistrationEventYear | number,
  patch: Partial<ScheduleMeta>,
): Promise<ScheduleMeta> {
  const y = Number(year)
  const current = await getScheduleMeta(y)
  const next: ScheduleMeta = {
    dateRange:
      patch.dateRange !== undefined
        ? String(patch.dateRange).trim() || current.dateRange
        : current.dateRange,
    location:
      patch.location !== undefined
        ? String(patch.location).trim() || current.location
        : current.location,
    draftNotice:
      patch.draftNotice !== undefined ? String(patch.draftNotice).trim() : current.draftNotice,
  }

  const value = JSON.stringify(next)
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${metaKey(y)}, ${value}, CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO UPDATE SET
      value = ${value},
      updated_at = CURRENT_TIMESTAMP
  `
  return next
}
