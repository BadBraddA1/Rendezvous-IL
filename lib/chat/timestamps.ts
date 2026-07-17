/**
 * Chat `created_at` values come from SQLite `CURRENT_TIMESTAMP` as
 * `YYYY-MM-DD HH:MM:SS` in UTC with no timezone marker. Browsers and iOS
 * often treat that as *local* time, so timestamps look several hours off.
 *
 * Always emit ISO-8601 UTC (`...Z`) from the API.
 */
export function normalizeChatTimestamp(raw: string | null | undefined): string {
  if (raw == null) return new Date().toISOString()
  const value = String(raw).trim()
  if (!value) return new Date().toISOString()

  // Already has an explicit zone (Z or ±HH:MM).
  if (/[zZ]$/.test(value) || /[+-]\d{2}:?\d{2}$/.test(value)) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
  }

  // "2026-07-17 03:18:04" or "2026-07-17T03:18:04" → treat as UTC.
  const withT = value.includes("T") ? value : value.replace(" ", "T")
  const parsed = new Date(`${withT}Z`)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
}
