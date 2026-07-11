/**
 * Normalize birthday values from the DB / APIs to YYYY-MM-DD.
 * Drivers often return ISO timestamps ("2025-11-05T00:00:00.000Z") or Date
 * objects; the registration UI expects a plain calendar date string.
 */
export function normalizeDateOfBirth(value: unknown): string {
  if (value == null || value === "") return ""

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ""
    const year = value.getUTCFullYear()
    const month = String(value.getUTCMonth() + 1).padStart(2, "0")
    const day = String(value.getUTCDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const raw = String(value).trim()
  if (!raw) return ""

  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (ymd) {
    return `${ymd[1]}-${ymd[2]}-${ymd[3]}`
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ""
  const year = parsed.getUTCFullYear()
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0")
  const day = String(parsed.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function formatDateOfBirthDisplay(value: string): string | null {
  const ymd = normalizeDateOfBirth(value)
  if (!ymd) return null
  const [year, month, day] = ymd.split("-").map(Number)
  if (!year || !month || !day) return null
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  return `${months[month - 1]} ${day}, ${year}`
}
