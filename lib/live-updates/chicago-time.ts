const CHICAGO_TZ = "America/Chicago"

/** Wall-clock components in America/Chicago for the given instant. */
export function getChicagoWallClock(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(now)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0)

  return new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  )
}

/** ISO-8601 string with America/Chicago offset, e.g. 2027-05-03T12:55:00-05:00 */
export function formatChicagoISO(now: Date = new Date()): string {
  const wall = new Intl.DateTimeFormat("sv-SE", {
    timeZone: CHICAGO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(now)
    .replace(" ", "T")

  const offsetLabel =
    new Intl.DateTimeFormat("en-US", {
      timeZone: CHICAGO_TZ,
      timeZoneName: "longOffset",
    })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT-06:00"

  const match = offsetLabel.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
  if (!match) {
    return `${wall}-06:00`
  }

  const sign = match[1]
  const hours = match[2].padStart(2, "0")
  const minutes = (match[3] ?? "00").padStart(2, "0")
  return `${wall}${sign}${hours}:${minutes}`
}
