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

/** Monday 2027-05-03 00:00 America/Chicago — shared rotation epoch for all Pis. */
export const LIVE_UPDATES_ROTATION_EPOCH_MS = new Date("2027-05-03T00:00:00-05:00").getTime()

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
}): ViewType[] {
  const views: ViewType[] = [...LIVE_UPDATES_BASE_VIEWS]
  if (options.hasVolunteerData) {
    views.push("volunteers")
  }
  if (options.announcementCount > 0) {
    views.push("announcements")
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

  const elapsed = Math.max(0, serverNowMs - epochMs)
  const bucket = Math.floor(elapsed / rotateMs)
  const viewIndex = bucket % viewCount
  const nextRotateAtMs = epochMs + (bucket + 1) * rotateMs

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
