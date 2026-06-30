// TEST MODE: Set to true ONLY during development to simulate the event clock.
// MUST be false in production — when true, the LU page ignores real time.
const TEST_MODE = false
const TEST_DATE = new Date("2027-05-03T12:55:00")

const CENTRAL_TIME_ZONE = "America/Chicago"

type CentralParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

/** Calendar clock fields in America/Chicago for a real instant. */
function getCentralParts(instant: Date): CentralParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  })

  const parts = formatter.formatToParts(instant)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)

  let hour = get("hour")
  if (hour === 24) hour = 0

  return {
    year: get("year"),
    month: get("month") - 1,
    day: get("day"),
    hour,
    minute: get("minute"),
    second: get("second"),
  }
}

/**
 * Current event time as a Date whose local getters match America/Chicago wall clock.
 * Safe on Pis regardless of device timezone (schedule code uses getHours/getDate).
 */
export function getCentralTime(): Date {
  if (TEST_MODE) {
    return TEST_DATE
  }

  const central = getCentralParts(new Date())
  return new Date(
    central.year,
    central.month,
    central.day,
    central.hour,
    central.minute,
    central.second,
  )
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
    timeZone: CENTRAL_TIME_ZONE,
  })
}

/** Minute bucket for schedule recalculation (events are minute-granular). */
export function scheduleMinuteKey(instant: Date = new Date()): string {
  const central = getCentralParts(instant)
  return [
    central.year,
    central.month,
    central.day,
    central.hour,
    central.minute,
  ].join("-")
}
