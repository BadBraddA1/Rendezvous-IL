import type { VolunteerSchedule, ViewType } from "@/lib/live-updates/types"
import { formatChicagoISO } from "@/lib/live-updates/chicago-time"

/** Matches live-updates-shell auto-rotate order (excludes manual-only "all" view). */
export const LIVE_UPDATES_BASE_VIEWS: ViewType[] = [
  "schedule",
  "weather",
  "meal",
  "map",
  "wifi",
  "upcoming",
]

export const LIVE_UPDATES_ROTATE_INTERVAL_MS = 15_000

/**
 * Shared rotation epoch for all Pis / room TVs.
 * Must be in the past so elapsed time advances (a future epoch freezes every
 * board on index 0 — photoshow and auto-rotate both stuck).
 */
export const LIVE_UPDATES_ROTATION_EPOCH_MS = new Date("2026-01-01T00:00:00-06:00").getTime()

function rotationElapsedMs(serverNowMs: number, epochMs: number): number {
  // If misconfigured into the future, fall back so screens still advance.
  const epoch = epochMs > serverNowMs ? new Date("2020-01-01T00:00:00Z").getTime() : epochMs
  return Math.max(0, serverNowMs - epoch)
}

export interface LiveUpdatesDisplayState {
  serverTime: string
  currentView: ViewType
  viewIndex: number
  nextRotateAt: string
  rotateIntervalMs: number
  availableViews: ViewType[]
  buildVersion: string
}

export function hasVolunteerData(schedule: VolunteerSchedule | null | undefined): boolean {
  if (!schedule) return false
  return !!(
    schedule.openingPrayer ||
    schedule.leadingSingingA ||
    schedule.leadingSingingB ||
    schedule.readingScriptureA ||
    schedule.presentingLessonA ||
    schedule.readingScriptureB ||
    schedule.presentingLessonB ||
    schedule.closingPrayer
  )
}

/** Mirrors `availableViews` in live-updates-shell.tsx. */
export function buildAvailableViews(options: {
  hasVolunteerData: boolean
  announcementCount: number
  photoshowCount?: number
}): ViewType[] {
  const views: ViewType[] = [...LIVE_UPDATES_BASE_VIEWS]
  if (options.hasVolunteerData) {
    views.push("volunteers")
  }
  if (options.announcementCount > 0) {
    views.push("announcements")
  }
  if ((options.photoshowCount ?? 0) > 0) {
    views.push("photoshow")
  }
  return views
}

export function computeRotationIndex(
  serverNowMs: number,
  viewCount: number,
  epochMs: number = LIVE_UPDATES_ROTATION_EPOCH_MS,
  rotateMs: number = LIVE_UPDATES_ROTATE_INTERVAL_MS,
): { viewIndex: number; nextRotateAtMs: number } {
  if (viewCount <= 0) {
    return { viewIndex: 0, nextRotateAtMs: serverNowMs + rotateMs }
  }

  const elapsed = rotationElapsedMs(serverNowMs, epochMs)
  const bucket = Math.floor(elapsed / rotateMs)
  const viewIndex = bucket % viewCount
  const nextRotateAtMs = serverNowMs - (elapsed % rotateMs) + rotateMs

  return { viewIndex, nextRotateAtMs }
}

export function buildDisplayState(
  availableViews: ViewType[],
  buildVersion: string,
  serverNowMs: number = Date.now(),
): LiveUpdatesDisplayState {
  const { viewIndex, nextRotateAtMs } = computeRotationIndex(
    serverNowMs,
    availableViews.length,
  )

  const currentView = availableViews[viewIndex] ?? availableViews[0] ?? "schedule"

  return {
    serverTime: formatChicagoISO(new Date(serverNowMs)),
    currentView,
    viewIndex,
    nextRotateAt: formatChicagoISO(new Date(nextRotateAtMs)),
    rotateIntervalMs: LIVE_UPDATES_ROTATE_INTERVAL_MS,
    availableViews,
    buildVersion,
  }
}

/** Client-side rotation helper (epoch-aligned with display-state API). */
export function computeDisplayState(
  availableViews: ViewType[],
  serverNowMs: number = Date.now(),
): Pick<LiveUpdatesDisplayState, "currentView" | "viewIndex" | "nextRotateAt"> {
  const state = buildDisplayState(availableViews, "", serverNowMs)
  return {
    currentView: state.currentView,
    viewIndex: state.viewIndex,
    nextRotateAt: state.nextRotateAt,
  }
}
