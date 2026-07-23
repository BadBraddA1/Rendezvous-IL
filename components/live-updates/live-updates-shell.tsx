"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { ViewTransition } from "@/components/view-transition"
import { KeyButton } from "@/components/live-updates/key-button"
import { LiveUpdatesClock } from "@/components/live-updates/live-updates-clock"
import {
  AllView,
  WeatherView,
  ScheduleView,
  MealView,
  MapView,
  VolunteersView,
  AnnouncementsView,
  WifiView,
  UpcomingView,
  PhotoshowView,
  prefetchLiveUpdateViews,
} from "@/components/live-updates/lazy-views"
import { fetchJsonCached } from "@/lib/fetch-json-cache"
import { computeScheduleSnapshot, LIVE_UPDATE_SCHEDULE } from "@/lib/live-updates/schedule"
import { computeDisplayState } from "@/lib/live-updates/display-state"
import {
  resolveDeviceId,
  resolveHostname,
  postHeartbeat,
  saveOfflineSnapshot,
} from "@/lib/live-updates/kiosk-heartbeat"
import { getCentralTime, scheduleMinuteKey as toScheduleMinuteKey } from "@/lib/live-updates/time"
import {
  ZOOM_STORAGE_KEY,
  ZOOM_BASE_PX,
  ZOOM_DEFAULT,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
} from "@/lib/live-updates/zoom"
import type {
  Announcement,
  WeatherData,
  VolunteerSchedule,
  MealData,
  ViewType,
  ScheduleItem,
} from "@/lib/live-updates/types"
import type { PhotoshowPhoto } from "@/lib/live-updates/photoshow-shared"

const VALID_VIEWS: ViewType[] = [
  "all",
  "weather",
  "schedule",
  "meal",
  "map",
  "wifi",
  "upcoming",
  "volunteers",
  "announcements",
  "photoshow",
]

function parseViewQueryParam(raw: string | null): ViewType | null {
  if (!raw) return null
  const normalized = raw.toLowerCase().trim()
  return VALID_VIEWS.includes(normalized as ViewType) ? (normalized as ViewType) : null
}

export function LiveUpdatesShell() {
  const searchParams = useSearchParams()
  const syncFromServer = searchParams.get("sync") === "1"
  const kioskMode = searchParams.get("kiosk") === "1"
  const fixedView = parseViewQueryParam(searchParams.get("view"))
  /** When set with view=photoshow, feed slides from that chat’s posted photos. */
  const photoshowChannelId = searchParams.get("channel")?.trim() || null
  const deviceId = resolveDeviceId(searchParams.get("device"))
  const hostname = resolveHostname(searchParams.get("hostname"))

  const [currentView, setCurrentView] = useState<ViewType>(() => fixedView ?? "schedule")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isAutoRotating, setIsAutoRotating] = useState(() => !fixedView)
  const [viewZoom, setViewZoom] = useState<Record<string, number>>({})
  // Hide the bottom control bar for a cleaner TV display. Toggle with "H" key.
  const [showControls, setShowControls] = useState(!kioskMode)

  // Hydrate zoom prefs from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(ZOOM_STORAGE_KEY)
      if (raw) setViewZoom(JSON.parse(raw))
    } catch {
      // ignore corrupt storage
    }
  }, [])

  const currentZoom = viewZoom[currentView] ?? ZOOM_DEFAULT
  const updateZoom = (next: number) => {
    // Round to the nearest ZOOM_STEP so the displayed % is always tidy
    const stepped = Math.round(next / ZOOM_STEP) * ZOOM_STEP
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, stepped))
    setViewZoom(prev => {
      const updated = { ...prev, [currentView]: clamped }
      try {
        window.localStorage.setItem(ZOOM_STORAGE_KEY, JSON.stringify(updated))
      } catch {
        // ignore storage failures (private mode etc.)
      }
      return updated
    })
  }
  const zoomIn = () => updateZoom(currentZoom + ZOOM_STEP)
  const zoomOut = () => updateZoom(currentZoom - ZOOM_STEP)
  const resetZoom = () => updateZoom(ZOOM_DEFAULT)

  // Apply the per-view zoom multiplier to the <html> element so every
  // rem-based Tailwind class (text-*, p-*, h-*, w-*, gap-*) scales in
  // lockstep. We use a fixed 16px baseline (browser default) so Tailwind's
  // size classes render at their documented pixel values:
  //   text-base=16, text-xl=20, text-2xl=24, text-3xl=30, text-4xl=36,
  //   text-5xl=48, text-6xl=60, text-7xl=72.
  // The user-controllable zoom multiplier (1× – 2.5×) lets each TV pick a
  // size that's readable across the room. The previous viewport-scaled
  // baseline was overshooting badly (~50px at 1080p), making text-2xl
  // render at 76px and breaking every layout  -  this is the fix for that.
  useEffect(() => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    const previous = root.style.fontSize
    root.style.fontSize = `${ZOOM_BASE_PX * currentZoom}px`
    return () => {
      root.style.fontSize = previous
    }
  }, [currentZoom])

  const [scheduleMinuteBucket, setScheduleMinuteBucket] = useState(() =>
    toScheduleMinuteKey(),
  )

  // Schedule items: start with the built-in list, then swap in the
  // admin-edited schedule from /api/schedule (refreshed every 10 minutes so
  // mid-event edits reach the TVs without a redeploy).
  const [luItems, setLuItems] = useState<ScheduleItem[]>(LIVE_UPDATE_SCHEDULE)
  useEffect(() => {
    let cancelled = false
    const fetchScheduleItems = async () => {
      try {
        const data = await fetchJsonCached<{ luItems?: ScheduleItem[] }>(
          "/api/schedule",
          5 * 60_000,
        )
        if (!cancelled && Array.isArray(data.luItems) && data.luItems.length > 0) {
          setLuItems(data.luItems)
        }
      } catch {
        // keep whatever we have (static fallback) — TVs must never blank out
      }
    }
    fetchScheduleItems()
    const interval = setInterval(fetchScheduleItems, 10 * 60_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  // Data states
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [volunteerSchedule, setVolunteerSchedule] = useState<VolunteerSchedule | null>(null)
  const [volunteerTimeSlot, setVolunteerTimeSlot] = useState<string>("")
  const [mealData, setMealData] = useState<MealData | null>(null)
  const [photoshowPhotos, setPhotoshowPhotos] = useState<PhotoshowPhoto[]>([])

  const [displayStateFailCount, setDisplayStateFailCount] = useState(0)
  const [weatherFetchOk, setWeatherFetchOk] = useState<boolean | null>(null)
  const [announcementsFetchOk, setAnnouncementsFetchOk] = useState<boolean | null>(null)

  const isOffline =
    (syncFromServer && displayStateFailCount >= 3) ||
    (weatherFetchOk === false && announcementsFetchOk === false)

  // Advance minute bucket once per clock minute (setState only when bucket changes).
  useEffect(() => {
    const syncMinuteBucket = () => {
      const next = toScheduleMinuteKey()
      setScheduleMinuteBucket((prev) => (prev === next ? prev : next))
    }
    syncMinuteBucket()
    const id = setInterval(syncMinuteBucket, 1000)
    return () => clearInterval(id)
  }, [])

  const { nowItem, nextItem, prevItem, nextMeal, upcomingToday, upcomingAll } = useMemo(
    () => computeScheduleSnapshot(getCentralTime(), luItems),
    [scheduleMinuteBucket, luItems],
  )

  // Check if volunteer schedule has data
  const hasVolunteerData = useMemo(() => {
    if (!volunteerSchedule) return false
    return !!(
      volunteerSchedule.openingPrayer ||
      volunteerSchedule.leadingSingingA ||
      volunteerSchedule.leadingSingingB ||
      volunteerSchedule.readingScriptureA ||
      volunteerSchedule.presentingLessonA ||
      volunteerSchedule.readingScriptureB ||
      volunteerSchedule.presentingLessonB ||
      volunteerSchedule.closingPrayer
    )
  }, [volunteerSchedule])

  // Conditionally show tabs based on available data
  // Note: "all" view is intentionally excluded from auto-rotation because it shows
  // too much info at once and is hard to read on a TV. It's still accessible via the "1" key.
  const availableViews = useMemo<ViewType[]>(() => {
    const views: ViewType[] = ["schedule", "weather", "meal", "map", "wifi", "upcoming"]
    if (hasVolunteerData) {
      views.push("volunteers")
    }
    if (announcements.length > 0) {
      views.push("announcements")
    }
    if (photoshowPhotos.length > 0) {
      views.push("photoshow")
    }
    return views
  }, [hasVolunteerData, announcements.length, photoshowPhotos.length])

  /** Dedicated room slideshow — full-bleed photos, no program chrome. */
  const photoshowOnly = fixedView === "photoshow"

  // Auto-refresh when a new deployment is detected.
  //
  // The /api/version endpoint returns a BUILD_TIME that changes on each deploy.
  // We store the version we loaded with and poll every 30 seconds  -  when the
  // server's version differs from ours, we reload the page so the TVs pick up
  // the new code automatically without anyone having to manually refresh.
  //
  // We preserve both fullscreen AND the current view/slide across the reload
  // so the experience is seamless  -  the page comes back to exactly where it was.
  const FULLSCREEN_RESTORE_KEY = "lu_restore_fullscreen"
  const VIEW_RESTORE_KEY = "lu_restore_view"
  const AUTO_ROTATE_RESTORE_KEY = "lu_restore_auto_rotate"
  const ZOOM_RESTORE_KEY = "lu_restore_zoom"
  const CONTROLS_RESTORE_KEY = "lu_restore_controls"

  // Pin view from ?view=… (cafeteria meal board, etc.) — overrides deploy-restore.
  useEffect(() => {
    if (!fixedView) return
    setCurrentView(fixedView)
    setIsAutoRotating(false)
  }, [fixedView])

  // On mount, check if we need to restore state after a deploy-reload.
  useEffect(() => {
    if (typeof window === "undefined") return

    // Restore view — skip when URL pins a fixed view
    if (!fixedView) {
      const savedView = sessionStorage.getItem(VIEW_RESTORE_KEY) as ViewType | null
      if (savedView) {
        sessionStorage.removeItem(VIEW_RESTORE_KEY)
        setCurrentView(savedView)
      }
    } else {
      sessionStorage.removeItem(VIEW_RESTORE_KEY)
    }

    // Restore auto-rotate state — skip when URL pins a fixed view
    if (!fixedView) {
      const savedAutoRotate = sessionStorage.getItem(AUTO_ROTATE_RESTORE_KEY)
      if (savedAutoRotate !== null) {
        sessionStorage.removeItem(AUTO_ROTATE_RESTORE_KEY)
        setIsAutoRotating(savedAutoRotate === "true")
      }
    } else {
      sessionStorage.removeItem(AUTO_ROTATE_RESTORE_KEY)
    }

    // Restore zoom (the entire viewZoom object, not just a single number)
    const savedZoom = sessionStorage.getItem(ZOOM_RESTORE_KEY)
    if (savedZoom) {
      sessionStorage.removeItem(ZOOM_RESTORE_KEY)
      try {
        const parsed = JSON.parse(savedZoom)
        setViewZoom(parsed)
      } catch {
        // ignore corrupt data
      }
    }

    // Restore controls visibility  -  hide controls on restore for clean TV display
    const savedControls = sessionStorage.getItem(CONTROLS_RESTORE_KEY)
    if (savedControls !== null) {
      sessionStorage.removeItem(CONTROLS_RESTORE_KEY)
      setShowControls(savedControls === "true")
    }

    // Restore fullscreen (with delay to let page settle)
    const shouldRestoreFullscreen = sessionStorage.getItem(FULLSCREEN_RESTORE_KEY)
    if (shouldRestoreFullscreen === "true") {
      sessionStorage.removeItem(FULLSCREEN_RESTORE_KEY)
      // Note: some browsers block this without a user gesture, but most TV
      // browsers (and Chrome in kiosk mode) allow it.
      setTimeout(() => {
        document.documentElement.requestFullscreen?.().catch(() => {
          // Browser blocked it  -  user will need to press F again.
        })
      }, 300)
    }
  }, [fixedView])

  // Pi kiosk: attempt fullscreen on load (Chromium kiosk allows without gesture).
  useEffect(() => {
    if (!kioskMode || typeof document === "undefined") return
    const timer = window.setTimeout(() => {
      document.documentElement.requestFullscreen?.().catch(() => {})
    }, 500)
    return () => window.clearTimeout(timer)
  }, [kioskMode])

  useEffect(() => {
    let initialVersion: string | null = null

    const checkVersion = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" })
        const data = await res.json()
        if (!initialVersion) {
          // First load  -  record the version we started with.
          initialVersion = data.version
        } else if (data.version !== initialVersion) {
          // Server version changed  -  a new deploy happened.
          // Stash ALL UI state so we can restore it after reload.
          sessionStorage.setItem(VIEW_RESTORE_KEY, currentView)
          sessionStorage.setItem(AUTO_ROTATE_RESTORE_KEY, String(isAutoRotating))
          sessionStorage.setItem(ZOOM_RESTORE_KEY, JSON.stringify(viewZoom))
          sessionStorage.setItem(CONTROLS_RESTORE_KEY, String(showControls))
          if (document.fullscreenElement) {
            sessionStorage.setItem(FULLSCREEN_RESTORE_KEY, "true")
          }
          window.location.reload()
        }
      } catch {
        // Network blip  -  ignore and try again next interval.
      }
    }

    checkVersion()
    const interval = setInterval(checkVersion, 30 * 1000) // every 30s
    return () => clearInterval(interval)
  }, [currentView, isAutoRotating, viewZoom, showControls])

  // Kiosk fleet heartbeat — POST device/view every 60s when ?kiosk=1.
  useEffect(() => {
    if (!kioskMode || !deviceId) return

    let buildVersion: string | undefined

    const sendHeartbeat = async () => {
      try {
        if (!buildVersion) {
          try {
            const res = await fetch("/api/version", { cache: "no-store" })
            const data = await res.json()
            buildVersion = data.version
          } catch {
            // buildVersion stays optional
          }
        }
        await postHeartbeat({
          deviceId,
          hostname,
          lastView: currentView,
          buildVersion,
        })
      } catch {
        // ignore transient network failures
      }
    }

    sendHeartbeat()
    const interval = setInterval(sendHeartbeat, 60 * 1000)
    return () => clearInterval(interval)
  }, [kioskMode, deviceId, hostname, currentView])

  // Fetch weather
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch("/api/weather")
        if (!res.ok) throw new Error(`weather ${res.status}`)
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setWeather(data)
        setWeatherFetchOk(true)
      } catch {
        setWeatherFetchOk(false)
      }
    }
    fetchWeather()
    const interval = setInterval(fetchWeather, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch announcements — 20s poll on kiosk, 60s otherwise.
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch("/api/announcements")
        if (!res.ok) throw new Error(`announcements ${res.status}`)
        const data = await res.json()
        if (!Array.isArray(data.announcements)) throw new Error("invalid announcements")
        setAnnouncements(data.announcements)
        setAnnouncementsFetchOk(true)
      } catch {
        setAnnouncementsFetchOk(false)
      }
    }
    fetchAnnouncements()
    const pollMs = kioskMode ? 20 * 1000 : 60 * 1000
    const interval = setInterval(fetchAnnouncements, pollMs)
    return () => clearInterval(interval)
  }, [kioskMode])

  // Photoshow slides — admin uploads, or ?channel=… for that chat’s photos.
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const qs = photoshowChannelId
          ? `?channel=${encodeURIComponent(photoshowChannelId)}`
          : ""
        const res = await fetch(`/api/live-updates/photos${qs}`, { cache: "no-store" })
        if (!res.ok) throw new Error(`photos ${res.status}`)
        const data = await res.json()
        if (Array.isArray(data.photos)) {
          setPhotoshowPhotos(data.photos)
        }
      } catch {
        // keep last good list
      }
    }
    fetchPhotos()
    const pollMs = kioskMode ? 30 * 1000 : 60 * 1000
    const interval = setInterval(fetchPhotos, pollMs)
    return () => clearInterval(interval)
  }, [kioskMode, photoshowChannelId])

  // Keep offline snapshot currentView in sync when rotating locally.
  useEffect(() => {
    if (announcements.length === 0 && !weather) return
    saveOfflineSnapshot({
      currentView,
      announcementTitles: announcements.map((a) => a.title),
      weatherTemp: weather?.current?.temp,
    })
  }, [currentView, announcements, weather])

  // Fetch meal data for the next upcoming meal.
  //
  // - Uses `nextMeal.date` (YYYY-MM-DD) directly so the lookup is correct
  //   even when "next meal" is tomorrow morning.
  // - Re-fetches every 2 minutes while the next meal is pinned, so the LU
  //   page recovers from transient API failures (TVs on flaky WiFi).
  // - Does NOT clear `mealData` on error  -  we keep the last good payload
  //   so a brief network blip never reverts the screen to "coming soon".
  useEffect(() => {
    if (!nextMeal || !nextMeal.isMeal) {
      setMealData(null)
      return
    }

    let cancelled = false

    // Determine meal type from title (matches /schedule page conventions).
    const title = nextMeal.title.toLowerCase()
    let mealType = "dinner"
    if (title.includes("breakfast")) mealType = "breakfast"
    else if (title.includes("lunch")) mealType = "lunch"

    const url = `/api/meals?date=${nextMeal.date}&mealType=${mealType}`

    const fetchMealData = async () => {
      try {
        const data = await fetchJsonCached<{ meals?: unknown[] }>(url, 30_000)
        if (cancelled) return
        if (data?.meals && data.meals.length > 0) {
          setMealData(data.meals[0])
        }
      } catch {
        // keep last good data
      }
    }

    fetchMealData()
    const interval = setInterval(fetchMealData, 2 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [nextMeal])

  // Fetch volunteer schedule for the NEXT upcoming devotion.
  //
  // Earlier versions hard-coded clock cutoffs (e.g. "before 10:30 AM →
  // Morning Devotion"), which broke on days that don't have both slots  - 
  // notably Monday, which has no Morning Devotion at all. The card would
  // ask the API for `Monday Morning Devotion`, get nothing, and show a
  // stale or empty schedule.
  //
  // We now drive the slot directly off SCHEDULE_ITEMS (the same data the
  // Schedule view uses): scan for the next "assembly" event whose end time
  // is still in the future, and use its date + start-time to choose the
  // volunteer slot. That guarantees we only ever ask the API for a slot
  // that actually exists on the schedule.
  useEffect(() => {
    const fetchVolunteerSchedule = async () => {
      try {
        const centralNow = getCentralTime()

        // Find the next assembly item that hasn't ended yet.
        const nextAssembly = luItems.find((item) => {
          if (!/assembly/i.test(item.title)) return false
          const [y, m, d] = item.date.split("-").map(Number)
          // Use end time when available, else assume the assembly runs ~1hr.
          const endH = item.endHour ?? item.startHour + 1
          const endM = item.endMinute ?? item.startMinute
          const endsAt = new Date(y, m - 1, d, endH, endM)
          return endsAt.getTime() > centralNow.getTime()
        })

        if (!nextAssembly) {
          // No upcoming assemblies left in the schedule at all.
          setVolunteerSchedule(null)
          setVolunteerTimeSlot("")
          return
        }

        const timeSlot: "Morning Devotion" | "Evening Devotion" =
          nextAssembly.startHour < 12 ? "Morning Devotion" : "Evening Devotion"

        const targetDateStr = nextAssembly.date

        // Friendly label like "Tuesday Morning Devotion"  -  derived from the
        // ScheduleItem's own `date` so it always matches the row we'll
        // request from the API.
        const [y, m, d] = targetDateStr.split("-").map(Number)
        const dayName = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" })
        setVolunteerTimeSlot(`${dayName} ${timeSlot}`)

        const data = await fetchJsonCached<{ schedule?: unknown }>(
          `/api/volunteer-schedule?date=${targetDateStr}&timeSlot=${encodeURIComponent(timeSlot)}`,
          30_000,
        )
        if (data.schedule) {
          setVolunteerSchedule(data.schedule)
        } else {
          // Clear stale data if no schedule exists for the new target slot.
          setVolunteerSchedule(null)
        }
      } catch {}
    }
    fetchVolunteerSchedule()
    const interval = setInterval(fetchVolunteerSchedule, 60 * 1000)
    return () => clearInterval(interval)
  }, [scheduleMinuteBucket, luItems])

  // Prefetch view chunks after first paint for smooth auto-rotate on TVs.
  useEffect(() => {
    if (typeof window === "undefined") return
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => prefetchLiveUpdateViews())
      return () => window.cancelIdleCallback(id)
    }
    const timeout = window.setTimeout(() => prefetchLiveUpdateViews(), 2000)
    return () => window.clearTimeout(timeout)
  }, [])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const selectView = useCallback((view: ViewType) => {
    setCurrentView(view)
    setIsAutoRotating(false)
  }, [])

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Auto-rotate — epoch-based via computeDisplayState; ?sync=1 polls the coordinator API.
  useEffect(() => {
    if (!isAutoRotating) return

    if (syncFromServer) {
      let cancelled = false

      const pollDisplayState = async () => {
        try {
          const res = await fetch("/api/live-updates/display-state", { cache: "no-store" })
          if (!res.ok) throw new Error(`display-state ${res.status}`)
          const data = await res.json()
          if (!cancelled) {
            setDisplayStateFailCount(0)
            if (data.currentView) {
              setCurrentView(data.currentView as ViewType)
            }
          }
        } catch {
          if (!cancelled) {
            setDisplayStateFailCount((n) => n + 1)
          }
        }
      }

      pollDisplayState()
      const interval = setInterval(pollDisplayState, 1000)
      return () => {
        cancelled = true
        clearInterval(interval)
      }
    }

    const tick = () => {
      const { currentView: nextView } = computeDisplayState(availableViews)
      setCurrentView(nextView)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [isAutoRotating, availableViews, syncFromServer])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "1":
          setCurrentView("all")
          setIsAutoRotating(false)
          break
        case "2":
          setCurrentView("weather")
          setIsAutoRotating(false)
          break
        case "3":
          setCurrentView("schedule")
          setIsAutoRotating(false)
          break
        case "4":
          setCurrentView("meal")
          setIsAutoRotating(false)
          break
        case "5":
          setCurrentView("map")
          setIsAutoRotating(false)
          break
        case "6":
          if (hasVolunteerData) {
            setCurrentView("volunteers")
            setIsAutoRotating(false)
          }
          break
        case "7":
          if (announcements.length > 0) {
            setCurrentView("announcements")
            setIsAutoRotating(false)
          }
          break
        case "8":
          setCurrentView("wifi")
          setIsAutoRotating(false)
          break
        case "9":
          setCurrentView("upcoming")
          setIsAutoRotating(false)
          break
        case "p":
        case "P":
          if (photoshowPhotos.length > 0) {
            setCurrentView("photoshow")
            setIsAutoRotating(false)
          }
          break
        case "0":
        case "a":
        case "A":
          if (!fixedView) setIsAutoRotating(prev => !prev)
          break
        case "f":
        case "F":
          toggleFullscreen()
          break
        case "h":
        case "H":
          setShowControls(prev => !prev)
          break
        case "ArrowRight":
          setCurrentView(prev => {
            const currentIndex = availableViews.indexOf(prev)
            const nextIndex = (currentIndex + 1) % availableViews.length
            return availableViews[nextIndex]
          })
          break
        case "ArrowLeft":
          setCurrentView(prev => {
            const currentIndex = availableViews.indexOf(prev)
            const prevIndex = (currentIndex - 1 + availableViews.length) % availableViews.length
            return availableViews[prevIndex]
          })
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleFullscreen, availableViews, announcements.length, hasVolunteerData, fixedView, photoshowPhotos.length])

  return (
    <div
      className={`live-updates-shell flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden text-[oklch(0.96_0.01_178)] ${
        photoshowOnly ? "bg-black" : ""
      }`}
    >
      {isOffline && (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-50 bg-amber-600 px-4 py-2 text-center text-sm font-semibold text-white sm:text-base"
        >
          Connection lost — showing last saved data
        </div>
      )}
      {/* Header  -  kept minimal: a tiny logo + the clock. Everything else
          (WiFi, branding tagline, etc.) was removed so the views below get
          maximum vertical space and aren't competing with header noise.
          Dedicated photoshow mode hides chrome for a true room slideshow. */}
      {!photoshowOnly && (
      <header className="site-chrome-top shrink-0 flex items-center justify-between gap-3 border-b border-primary/20 px-4 py-3 sm:gap-6 sm:px-8 sm:py-4">
        <div className="flex items-center gap-3 min-w-0 shrink">
          <div className="relative h-11 w-11 shrink-0 rounded-lg bg-white/5 border border-primary/20 p-1.5 flex items-center justify-center">
            <Image
              src="/rendezvous-logo.png"
              alt="Rendezvous Homeschool Family Retreat"
              width={44}
              height={44}
              className="object-contain brightness-0 invert"
              priority
            />
          </div>
          <h1 className="text-base sm:text-xl font-bold tracking-wide truncate sm:whitespace-nowrap">
            Live updates · Rendezvous 2027
          </h1>
        </div>

        <LiveUpdatesClock />
      </header>
      )}

      {/* Main Content */}
      <main
        id="main-content"
        className={`relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto overflow-x-hidden [contain:layout_style_paint] ${
          photoshowOnly
            ? "p-0 lg:overflow-hidden"
            : "p-4 sm:p-8 lg:overflow-hidden lg:p-12"
        }`}
      >
        <ViewTransition
          viewKey={currentView}
          className={
            photoshowOnly
              ? "absolute inset-0"
              : "flex h-full w-full items-center justify-center"
          }
        >
          {currentView === "all" && (
            <AllView 
              weather={weather} 
              nowItem={nowItem} 
              nextItem={nextItem} 
              nextMeal={nextMeal}
              upcomingToday={upcomingToday}
              upcomingAll={upcomingAll}
              volunteerSchedule={volunteerSchedule}
              volunteerTimeSlot={volunteerTimeSlot}
            />
          )}
          {currentView === "weather" && (
            <WeatherView weather={weather} />
          )}
          {currentView === "schedule" && (
            <ScheduleView nowItem={nowItem} nextItem={nextItem} />
          )}
          {currentView === "meal" && (
            <MealView nextMeal={nextMeal} mealData={mealData} />
          )}
          {currentView === "map" && (
            <MapView nowItem={nowItem} nextItem={nextItem} prevItem={prevItem} />
          )}
          {currentView === "volunteers" && (
            <VolunteersView volunteerSchedule={volunteerSchedule} volunteerTimeSlot={volunteerTimeSlot} />
          )}
          {currentView === "announcements" && (
            <AnnouncementsView announcements={announcements} />
          )}
          {currentView === "wifi" && (
            <WifiView />
          )}
          {currentView === "upcoming" && (
            <UpcomingView nowItem={nowItem} upcomingToday={upcomingToday} upcomingAll={upcomingAll} />
          )}
          {currentView === "photoshow" && (
            <PhotoshowView photos={photoshowPhotos} immersive={photoshowOnly} />
          )}
        </ViewTransition>
      </main>

      {/* Keyboard Controls Footer - hidden in fullscreen or when controls are hidden (press H to toggle) */}
      {!isFullscreen && showControls && !photoshowOnly && (
      <footer className="site-chrome-bottom shrink-0 border-t border-primary/20 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-6 lg:px-12">
        <div className="scroll-touch-x flex flex-nowrap items-center justify-start gap-4 sm:flex-wrap sm:justify-center">
          <KeyButton shortcut="1" name="All" active={currentView === "all"} onClick={() => selectView("all")} />
          <KeyButton shortcut="2" name="Weather" active={currentView === "weather"} onClick={() => selectView("weather")} />
          <KeyButton shortcut="3" name="Schedule" active={currentView === "schedule"} onClick={() => selectView("schedule")} />
          <KeyButton shortcut="4" name="Meal" active={currentView === "meal"} onClick={() => selectView("meal")} />
          <KeyButton shortcut="5" name="Map" active={currentView === "map"} onClick={() => selectView("map")} />
          {hasVolunteerData && (
            <KeyButton shortcut="6" name="Volunteers" active={currentView === "volunteers"} onClick={() => selectView("volunteers")} />
          )}
          {announcements.length > 0 && (
            <KeyButton
              shortcut="7"
              name="Announcements"
              active={currentView === "announcements"}
              onClick={() => selectView("announcements")}
            />
          )}
          <KeyButton shortcut="8" name="WiFi" active={currentView === "wifi"} onClick={() => selectView("wifi")} />
          <KeyButton shortcut="9" name="Up next" active={currentView === "upcoming"} onClick={() => selectView("upcoming")} />
          {photoshowPhotos.length > 0 && (
            <KeyButton
              shortcut="P"
              name="Photoshow"
              active={currentView === "photoshow"}
              onClick={() => selectView("photoshow")}
            />
          )}
          {!fixedView && (
          <KeyButton
            shortcut="0"
            name="Auto rotate"
            active={isAutoRotating}
            onClick={() => setIsAutoRotating((prev) => !prev)}
            ariaLabel={isAutoRotating ? "Stop auto rotate" : "Start auto rotate"}
          />
          )}
          <KeyButton
            shortcut="F"
            name="Fullscreen"
            active={isFullscreen}
            onClick={toggleFullscreen}
            ariaLabel={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          />

          {/* Per-view zoom controls  -  saved to localStorage so each TV
              remembers its preferred size for each panel. The widget is
              intentionally larger / brighter than the keyboard hints so it's
              easy to find on a projection screen. The label includes the
              current view name so it's obvious that resizing is per-page. */}
          <div className="ml-2 flex items-center gap-2 rounded-xl border border-primary/20 bg-white/[0.04] px-4 py-2">
            <span className="mr-1 text-base font-semibold text-primary">Size</span>
            <button
              type="button"
              onClick={zoomOut}
              disabled={currentZoom <= ZOOM_MIN + 0.001}
              className="flex items-center justify-center h-12 w-12 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg"
              aria-label="Decrease size"
              title="Decrease size"
            >
              <ZoomOut className="h-6 w-6" />
            </button>
            <span className="lu-text-body text-xl tabular-nums w-20 text-center font-bold">
              {Math.round(currentZoom * 100)}%
            </span>
            <button
              type="button"
              onClick={zoomIn}
              disabled={currentZoom >= ZOOM_MAX - 0.001}
              className="flex items-center justify-center h-12 w-12 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg"
              aria-label="Increase size"
              title="Increase size"
            >
              <ZoomIn className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              disabled={Math.abs(currentZoom - ZOOM_DEFAULT) < 0.001}
              className="flex items-center justify-center h-12 w-12 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Reset size"
              title="Reset size"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>

          {isAutoRotating && (
            <span className="lu-text-muted text-sm ml-4 hidden sm:inline">
              Auto-rotating
            </span>
          )}
        </div>
      </footer>
      )}
    </div>
  )
}
