/** Event site timezone — used for admin-facing timestamps. */
export const RENDEZVOUS_TIME_ZONE = "America/Chicago"

/**
 * Parse timestamps from Turso/SQLite.
 * `CURRENT_TIMESTAMP` is UTC stored as `YYYY-MM-DD HH:MM:SS` with no `Z`.
 */
export function parseDbTimestamp(value: string | Date | null | undefined): Date | null {
  if (value == null) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const trimmed = String(value).trim()
  if (!trimmed) return null

  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T")
  const withUtc = /[zZ]$/.test(normalized) ? normalized : `${normalized}Z`
  const parsed = new Date(withUtc)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function toDbTimestampIso(value: string | Date | null | undefined): string | null {
  const parsed = parseDbTimestamp(value)
  return parsed ? parsed.toISOString() : null
}

export function centralDateKey(date: Date, timeZone = RENDEZVOUS_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export function formatInTimeZone(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  timeZone = RENDEZVOUS_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone }).format(date)
}

export function formatAuditListTimestamp(value: string | Date | null | undefined) {
  const date = parseDbTimestamp(value)
  if (!date) {
    return { relative: "", absolute: "—", date: null as Date | null }
  }

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  let relative: string
  if (diffMin < 1) relative = "Just now"
  else if (diffMin < 60) relative = `${diffMin}m ago`
  else if (diffHr < 24) relative = `${diffHr}h ago`
  else if (diffDay < 7) relative = `${diffDay}d ago`
  else relative = ""

  const centralYear = formatInTimeZone(date, { year: "numeric" })
  const currentCentralYear = formatInTimeZone(now, { year: "numeric" })

  const absolute = formatInTimeZone(date, {
    month: "short",
    day: "numeric",
    year: centralYear !== currentCentralYear ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  })

  return { relative, absolute, date }
}

export function formatAuditDetailTimestamp(value: string | Date | null | undefined): string {
  const date = parseDbTimestamp(value)
  if (!date) return "—"

  return formatInTimeZone(date, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  })
}

export function formatAuditGroupLabel(
  value: string | Date | null | undefined,
  timeZone = RENDEZVOUS_TIME_ZONE,
): string {
  const date = parseDbTimestamp(value)
  if (!date) return "Unknown date"

  const key = centralDateKey(date, timeZone)
  const todayKey = centralDateKey(new Date(), timeZone)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = centralDateKey(yesterday, timeZone)

  if (key === todayKey) return "Today"
  if (key === yesterdayKey) return "Yesterday"

  return formatInTimeZone(date, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}
