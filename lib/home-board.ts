import { sql } from "@/lib/db"
import type { RegistrationEventYear } from "@/lib/registration-event-years"

export type HomeBoardBuiltinType =
  | "header"
  | "check_in"
  | "now_next"
  | "weather"
  | "announcements"
  | "next_meal"
  | "chat"
  | "volunteering"

export type HomeBoardBuiltinSection = {
  id: string
  type: HomeBoardBuiltinType
  enabled: boolean
}

export type HomeBoardBannerSection = {
  id: string
  type: "banner"
  enabled: boolean
  title: string
  body: string
  linkUrl?: string
  linkLabel?: string
}

export type HomeBoardSection = HomeBoardBuiltinSection | HomeBoardBannerSection

export type HomeBoardConfig = {
  eventYear: number
  sections: HomeBoardSection[]
}

const BUILTIN_ORDER: HomeBoardBuiltinType[] = [
  "header",
  "check_in",
  "now_next",
  "weather",
  "announcements",
  "next_meal",
  "chat",
  "volunteering",
]

const BUILTIN_TYPES = new Set<string>(BUILTIN_ORDER)

function boardKey(year: number): string {
  return `home_board_${year}`
}

export function defaultHomeBoard(year: number): HomeBoardConfig {
  return {
    eventYear: year,
    sections: BUILTIN_ORDER.map((type) => ({
      id: type,
      type,
      enabled: true,
    })),
  }
}

function isBuiltinType(value: unknown): value is HomeBoardBuiltinType {
  return typeof value === "string" && BUILTIN_TYPES.has(value)
}

function parseSection(raw: unknown): HomeBoardSection | null {
  if (!raw || typeof raw !== "object") return null
  const obj = raw as Record<string, unknown>
  const id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : null
  const type = typeof obj.type === "string" ? obj.type : null
  if (!id || !type) return null
  const enabled = obj.enabled !== false

  if (type === "banner") {
    return {
      id,
      type: "banner",
      enabled,
      title: typeof obj.title === "string" ? obj.title.trim() : "",
      body: typeof obj.body === "string" ? obj.body.trim() : "",
      linkUrl:
        typeof obj.linkUrl === "string" && obj.linkUrl.trim()
          ? obj.linkUrl.trim()
          : undefined,
      linkLabel:
        typeof obj.linkLabel === "string" && obj.linkLabel.trim()
          ? obj.linkLabel.trim()
          : undefined,
    }
  }

  if (!isBuiltinType(type)) return null
  return { id, type, enabled }
}

function parseConfig(raw: unknown, year: number): HomeBoardConfig {
  const fallback = defaultHomeBoard(year)
  if (!raw || typeof raw !== "object") return fallback
  const obj = raw as Record<string, unknown>
  const sectionsRaw = Array.isArray(obj.sections) ? obj.sections : null
  if (!sectionsRaw) return fallback

  const parsed = sectionsRaw
    .map(parseSection)
    .filter((section): section is HomeBoardSection => section != null)

  // Ensure every builtin type exists exactly once (restore missing; drop dupes).
  const seenBuiltin = new Set<HomeBoardBuiltinType>()
  const sections: HomeBoardSection[] = []
  for (const section of parsed) {
    if (section.type === "banner") {
      sections.push(section)
      continue
    }
    if (seenBuiltin.has(section.type)) continue
    seenBuiltin.add(section.type)
    sections.push(section)
  }
  for (const type of BUILTIN_ORDER) {
    if (!seenBuiltin.has(type)) {
      sections.push({ id: type, type, enabled: true })
    }
  }

  return { eventYear: year, sections }
}

export async function getHomeBoard(
  year: RegistrationEventYear | number,
): Promise<HomeBoardConfig> {
  const y = Number(year)
  try {
    const [row] = await sql`
      SELECT value FROM app_settings WHERE key = ${boardKey(y)}
    `
    if (!row?.value) return defaultHomeBoard(y)
    try {
      return parseConfig(JSON.parse(String(row.value)), y)
    } catch {
      return defaultHomeBoard(y)
    }
  } catch {
    return defaultHomeBoard(y)
  }
}

export async function setHomeBoard(
  year: RegistrationEventYear | number,
  input: { sections: HomeBoardSection[] },
): Promise<HomeBoardConfig> {
  const y = Number(year)
  const next = parseConfig({ sections: input.sections }, y)
  const value = JSON.stringify(next)
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${boardKey(y)}, ${value}, CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO UPDATE SET
      value = ${value},
      updated_at = CURRENT_TIMESTAMP
  `
  return next
}
