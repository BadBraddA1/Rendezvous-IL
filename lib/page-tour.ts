export type PageTourRoute = {
  path: string
  label: string
  group: "public" | "special" | "dev"
}

/** Ordered list for localhost visual QA — header clearance, layout, icons near nav. */
export const PAGE_TOUR_ROUTES: PageTourRoute[] = [
  { path: "/", label: "Home", group: "public" },
  { path: "/schedule", label: "Schedule", group: "public" },
  { path: "/about", label: "About", group: "public" },
  { path: "/biblebowl", label: "Bible Bowl", group: "public" },
  { path: "/faq", label: "FAQ", group: "public" },
  { path: "/calculator", label: "Calculator", group: "public" },
  { path: "/map2026", label: "Attendee Map", group: "public" },
  { path: "/registration", label: "Registration", group: "public" },
  { path: "/install", label: "Install PWA", group: "public" },
  { path: "/scrabble", label: "Scrabble", group: "public" },
  { path: "/scrabble-rules", label: "Scrabble Rules", group: "public" },
  { path: "/privacy", label: "Privacy", group: "public" },
  { path: "/EEF", label: "Event Feedback", group: "public" },
  { path: "/live-updates", label: "Live Updates", group: "special" },
  { path: "/silent", label: "Silent Phone", group: "special" },
  { path: "/eod", label: "End of Day", group: "special" },
  { path: "/sign-in", label: "Sign In", group: "special" },
  { path: "/geocode", label: "Geocode Tool", group: "dev" },
  { path: "/registration-test2026", label: "Registration Test", group: "dev" },
  { path: "/map-editor", label: "Map Editor", group: "dev" },
]

export const PAGE_TOUR_STORAGE = {
  active: "rendezvous-page-tour-active",
  index: "rendezvous-page-tour-index",
  intervalSec: "rendezvous-page-tour-interval-sec",
  paused: "rendezvous-page-tour-paused",
  includeDev: "rendezvous-page-tour-include-dev",
  includeSpecial: "rendezvous-page-tour-include-special",
  preset: "rendezvous-page-tour-preset",
  customIndices: "rendezvous-page-tour-custom-indices",
} as const

export type PageTourPreset = "full" | "header-qa" | "custom"

/** 1-based indices into PAGE_TOUR_ROUTES — pages that needed header clearance fixes. */
export const PAGE_TOUR_HEADER_QA_INDICES = [1, 2, 3, 9, 13, 19, 18] as const

export const PAGE_TOUR_DEFAULT_INTERVAL_SEC = 2

export function routesFromIndices(
  indices: readonly number[],
  all: PageTourRoute[] = PAGE_TOUR_ROUTES,
): PageTourRoute[] {
  return indices
    .map((oneBased) => all[oneBased - 1])
    .filter((route): route is PageTourRoute => route != null)
}

export const PAGE_TOUR_HEADER_QA_ROUTES = routesFromIndices(PAGE_TOUR_HEADER_QA_INDICES)

export function parseRouteIndices(raw: string | null | undefined): number[] | null {
  if (!raw?.trim()) return null
  const parts = raw.split(/[,\s]+/).map((s) => Number.parseInt(s.trim(), 10))
  if (parts.some((n) => !Number.isFinite(n) || n < 1)) return null
  return parts
}

export function getTourRoutes(options?: {
  includeSpecial?: boolean
  includeDev?: boolean
}): PageTourRoute[] {
  const includeSpecial = options?.includeSpecial ?? true
  const includeDev = options?.includeDev ?? true

  return PAGE_TOUR_ROUTES.filter((route) => {
    if (route.group === "public") return true
    if (route.group === "special") return includeSpecial
    return includeDev
  })
}

export function getActiveTourRoutes(): PageTourRoute[] {
  if (typeof window === "undefined") return PAGE_TOUR_ROUTES

  const preset = (sessionStorage.getItem(PAGE_TOUR_STORAGE.preset) ?? "full") as PageTourPreset

  if (preset === "header-qa") {
    return PAGE_TOUR_HEADER_QA_ROUTES
  }

  if (preset === "custom") {
    const indices = parseRouteIndices(sessionStorage.getItem(PAGE_TOUR_STORAGE.customIndices))
    if (indices?.length) return routesFromIndices(indices)
  }

  return getTourRoutes({
    includeSpecial: sessionStorage.getItem(PAGE_TOUR_STORAGE.includeSpecial) !== "0",
    includeDev: sessionStorage.getItem(PAGE_TOUR_STORAGE.includeDev) !== "0",
  })
}

export function startPageTourSession(options: {
  preset: PageTourPreset
  intervalSec: number
  includeSpecial?: boolean
  includeDev?: boolean
  customIndices?: number[]
}): PageTourRoute[] {
  sessionStorage.setItem(PAGE_TOUR_STORAGE.active, "1")
  sessionStorage.setItem(PAGE_TOUR_STORAGE.index, "0")
  sessionStorage.setItem(PAGE_TOUR_STORAGE.intervalSec, String(options.intervalSec))
  sessionStorage.setItem(PAGE_TOUR_STORAGE.paused, "0")
  sessionStorage.setItem(PAGE_TOUR_STORAGE.preset, options.preset)

  if (options.preset === "full") {
    sessionStorage.setItem(PAGE_TOUR_STORAGE.includeSpecial, options.includeSpecial !== false ? "1" : "0")
    sessionStorage.setItem(PAGE_TOUR_STORAGE.includeDev, options.includeDev !== false ? "1" : "0")
  }

  if (options.preset === "custom" && options.customIndices?.length) {
    sessionStorage.setItem(PAGE_TOUR_STORAGE.customIndices, options.customIndices.join(","))
  }

  if (options.preset === "header-qa") {
    return PAGE_TOUR_HEADER_QA_ROUTES
  }
  if (options.preset === "custom" && options.customIndices?.length) {
    return routesFromIndices(options.customIndices)
  }
  return getTourRoutes({
    includeSpecial: options.includeSpecial,
    includeDev: options.includeDev,
  })
}

export function findTourIndex(pathname: string, routes: PageTourRoute[]): number {
  return routes.findIndex((route) => route.path === pathname)
}

export function nextTourIndex(current: number, total: number): number {
  if (total <= 0) return 0
  return (current + 1) % total
}

export function prevTourIndex(current: number, total: number): number {
  if (total <= 0) return 0
  return (current - 1 + total) % total
}

export function isLocalhostHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
}

export function canUsePageTour(hostname: string): boolean {
  return process.env.NODE_ENV === "development" && isLocalhostHost(hostname)
}
