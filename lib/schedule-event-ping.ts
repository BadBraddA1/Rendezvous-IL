/**
 * Custom organizer pings tied to schedule events (send now or at event time).
 */

import { createAnnouncement } from "@/lib/announcements"
import { effectiveEventDate, getScheduleEventById } from "@/lib/event-schedule"
import { parseTimeString } from "@/lib/schedule-data"

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

/** Rough Chicago offset: CDT (-05) Mar–Oct, CST (-06) otherwise. */
function chicagoOffsetForDate(isoDate: string): string {
  const month = Number(isoDate.slice(5, 7))
  return month >= 3 && month <= 10 ? "-05:00" : "-06:00"
}

function chicagoInstant(isoDate: string, hour: number, minute: number): string {
  return `${isoDate}T${pad2(hour)}:${pad2(minute)}:00${chicagoOffsetForDate(isoDate)}`
}

export type EventPingMode = "now" | "at_start" | "minutes_before"

export type EventPingInput = {
  scheduleEventId: number
  mode: EventPingMode
  /** Used when mode is minutes_before (e.g. 10 = 10 minutes before start). */
  minutesBefore?: number
  title?: string
  message?: string
  showOnLiveUpdates?: boolean
  showOnSchedule?: boolean
  createdBy?: string
}

export async function createEventPing(input: EventPingInput) {
  const event = await getScheduleEventById(input.scheduleEventId)
  if (!event) {
    throw new Error("Schedule event not found")
  }

  const year = event.event_year
  const isoDate = effectiveEventDate(event, year)
  if (!isoDate && input.mode !== "now") {
    throw new Error("Event has no calendar date — cannot schedule a ping")
  }

  let publishAt: string | null = null
  if (input.mode === "now") {
    publishAt = null
  } else if (isoDate) {
    let { startHour, startMinute } = parseTimeString(event.time)
    if (input.mode === "minutes_before") {
      const mins = Math.max(0, Math.floor(Number(input.minutesBefore) || 0))
      const total = startHour * 60 + startMinute - mins
      const clamped = Math.max(0, total)
      startHour = Math.floor(clamped / 60)
      startMinute = clamped % 60
    }
    // Normalize to UTC ISO so cron string compares stay ordered.
    publishAt = new Date(chicagoInstant(isoDate, startHour, startMinute)).toISOString()
  }

  const locationBit = event.location ? ` at ${event.location}` : ""
  const defaultTitle = event.title
  const defaultMessage =
    input.mode === "now"
      ? `${event.time} — ${event.title}${locationBit}`
      : `Starting soon: ${event.title}${locationBit} (${event.time})`

  return createAnnouncement({
    title: (input.title || defaultTitle).trim(),
    message: (input.message || defaultMessage).trim(),
    priority: "normal",
    showOnLiveUpdates: input.showOnLiveUpdates ?? true,
    showOnSchedule: input.showOnSchedule ?? false,
    sendPush: true,
    publishAt,
    scheduleEventId: event.id,
    createdBy: input.createdBy || "admin",
  })
}
