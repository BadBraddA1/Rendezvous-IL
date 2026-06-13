"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Image from "next/image"
import { mapLocations, mapPaths } from "@/lib/venue-map-data"
import { LU_SCHEDULE_ITEMS } from "@/lib/schedule-data"
import { LU_ICON, LU_PIN_COLORS, luPinStyle } from "@/lib/live-updates-colors"
import { ViewTransition } from "@/components/view-transition"

import { 
  Sun, Cloud, CloudRain, CloudSnow, Wind, CloudLightning, CloudFog, Cloudy, CloudSun,
  Calendar, MapPin, Clock, ChevronRight, Users, Utensils, Coffee, Sandwich, Bed,
  UtensilsCrossed, ClipboardCheck, Camera, Music, Gamepad2, Mountain, Trophy, Palette,
  BookOpen, Dumbbell, TreePine, Flame, Tent, Heart, Star, Sparkles, PartyPopper,
  Moon, Megaphone, Wifi,
  Target, Volleyball, Hand, Snowflake, Droplets,
  ZoomIn, ZoomOut, RotateCcw
} from "lucide-react"

interface Announcement {
  id: number
  title: string
  message: string
  priority: string
  is_active: boolean
  show_on_live_updates: boolean
  created_at: string
  expires_at: string | null
}

interface HourlyForecast {
  dt: number
  temp: number
  feels_like: number
  humidity: number
  weather: {
    id: number
    main: string
    description: string
    icon: string
  }[]
  pop: number
  wind_speed: number
}

interface WeatherData {
  current: {
    dt: number
    temp: number
    feels_like: number
    humidity: number
    weather: {
      id: number
      main: string
      description: string
      icon: string
    }[]
    wind_speed: number
  }
  hourly: HourlyForecast[]
}

interface ScheduleItem {
  date: string
  day: string
  time: string
  startHour: number
  startMinute: number
  endHour?: number
  endMinute?: number
  title: string
  location?: string
  isMeal?: boolean
}

interface VolunteerSchedule {
  openingPrayer: string | null
  leadingSingingA: string | null
  leadingSingingB: string | null
  readingScriptureA: string | null
  presentingLessonA: string | null
  lessonTitleA: string | null
  lessonScriptureA: string | null
  readingScriptureB: string | null
  presentingLessonB: string | null
  lessonTitleB: string | null
  lessonScriptureB: string | null
  closingPrayer: string | null
}

interface MealData {
  id: number
  date: string
  meal_type: string
  main_dish: string
  sides: string[] | null
  dessert: string | null
  drinks: string[] | null
  notes: string | null
  title: string | null
}

// SCHEDULE_ITEMS is sourced from `lib/schedule-data.ts` (single source of truth).
// Update times / titles / locations there  -  both the printable schedule, the
// downloadable PDF, and this Live Updates page will stay in sync.
const SCHEDULE_ITEMS: ScheduleItem[] = LU_SCHEDULE_ITEMS as ScheduleItem[]

type ViewType = "all" | "weather" | "schedule" | "meal" | "volunteers" | "announcements" | "map" | "wifi" | "upcoming"

// Match a schedule item to a venue map location id
function getLocationIdForEvent(item: ScheduleItem | null): string | null {
  if (!item) return null
  const title = item.title.toLowerCase()
  const location = (item.location || "").toLowerCase()

  // Specific activities first
  if (title.includes("archery")) return "archery"
  if (title.includes("human foosball")) return "human-foosball"
  if (title.includes("disc golf")) return "disc-golf"
  if (title.includes("kickball")) return "rec-field-kickball"
  if (title.includes("capture the flag")) return "rec-field-kickball"
  if (title.includes("bonfire")) return "bonfire-site"
  if (title.includes("hayride")) return "bonfire-site"

  // Location-based fallback
  if (location.includes("lakeside") || location.includes("dining")) return "lakeside-dining"
  if (location.includes("bonfire") || location.includes("pavilion")) return "bonfire-site"
  if (location.includes("rec field") || location.includes("recreation field")) return "rec-field-kickball"
  if (location.includes("activity center") || location.includes("ac room") || location.includes("activities center")) return "activities-center"

  // Meals → dining hall
  if (item.isMeal) return "lakeside-dining"

  // Default to activity center for assemblies/sessions
  return "activities-center"
}

function LuNowDot({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass =
    size === "lg" ? "h-5 w-5" : size === "md" ? "h-3 w-3" : "h-2.5 w-2.5"
  return (
    <span
      className={`inline-flex shrink-0 rounded-full lu-bg-now ${sizeClass}`}
      aria-hidden="true"
    />
  )
}

function getEventIcon(
  title: string, 
  isMeal?: boolean, 
  size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" = "md",
  colorOverrideClass?: string
) {
  const lowerTitle = title.toLowerCase()
  const sizeClasses = {
    xs: "h-7 w-7",
    sm: "h-9 w-9",
    md: "h-14 w-14",
    lg: "h-20 w-20",
    xl: "h-28 w-28",
    "2xl": "h-36 w-36",
  }
  const sz = sizeClasses[size]
  const base = `${sz} shrink-0`
  // If a color override class is given, use it instead of the per-event color
  const c = (defaultClass: string) => colorOverrideClass ?? defaultClass
  
  if (isMeal) {
    if (lowerTitle.includes('breakfast')) return <Coffee className={`${base} ${c(LU_ICON.meal)}`} />
    if (lowerTitle.includes('lunch')) return <Sandwich className={`${base} ${c(LU_ICON.meal)}`} />
    if (lowerTitle.includes('dinner')) return <UtensilsCrossed className={`${base} ${c(LU_ICON.meal)}`} />
    return <Utensils className={`${base} ${c(LU_ICON.meal)}`} />
  }
  
  if (lowerTitle.includes('good night')) return <Moon className={`${base} ${c(LU_ICON.muted)}`} />
  if (lowerTitle.includes('check-in') || lowerTitle.includes('checkout')) return <ClipboardCheck className={`${base} ${c(LU_ICON.lake)}`} />
  if (lowerTitle.includes('assembly') || lowerTitle.includes('announcement')) return <Megaphone className={`${base} ${c(LU_ICON.coral)}`} />
  if (lowerTitle.includes('archery')) return <Target className={`${base} ${c(LU_ICON.coral)}`} />
  if (lowerTitle.includes('dodgeball')) return <Volleyball className={`${base} ${c(LU_ICON.lake)}`} />
  if (lowerTitle.includes('game') || lowerTitle.includes('knockout')) return <Gamepad2 className={`${base} ${c(LU_ICON.lake)}`} />
  if (lowerTitle.includes('obstacle') || lowerTitle.includes('rope')) return <Mountain className={`${base} ${c(LU_ICON.muted)}`} />
  if (lowerTitle.includes('gym') || lowerTitle.includes('sport')) return <Dumbbell className={`${base} ${c(LU_ICON.lake)}`} />
  if (lowerTitle.includes('bonfire') || lowerTitle.includes('fire')) return <Flame className={`${base} ${c(LU_ICON.warm)}`} />
  if (lowerTitle.includes('picture') || lowerTitle.includes('photo')) return <Camera className={`${base} ${c(LU_ICON.lake)}`} />
  if (lowerTitle.includes('award') || lowerTitle.includes('ceremony')) return <Trophy className={`${base} ${c(LU_ICON.warm)}`} />
  if (lowerTitle.includes('farewell') || lowerTitle.includes('goodbye')) return <Hand className={`${base} ${c(LU_ICON.warm)}`} />
  if (lowerTitle.includes('ice breaker') || lowerTitle.includes('introduction')) return <Users className={`${base} ${c(LU_ICON.lake)}`} />
  if (lowerTitle.includes('nine square')) return <Grid3x3 className={`${base} ${c(LU_ICON.lake)}`} />
  if (lowerTitle.includes('table game')) return <Dice5 className={`${base} ${c(LU_ICON.lake)}`} />
  if (lowerTitle.includes('mom') || lowerTitle.includes('family')) return <Heart className={`${base} ${c(LU_ICON.coral)}`} />
  if (lowerTitle.includes('young adult') || lowerTitle.includes('session') || lowerTitle.includes('meeting')) return <Users className={`${base} ${c(LU_ICON.lake)}`} />
  if (lowerTitle.includes('afternoon') || lowerTitle.includes('activities')) return <Sun className={`${base} ${c(LU_ICON.warm)}`} />
  if (lowerTitle.includes('evening')) return <Moon className={`${base} ${c(LU_ICON.muted)}`} />
  
  return <MapPin className={`${base} ${c(LU_ICON.upcoming)}`} />
}

// TEST MODE: Set to true ONLY during development to simulate the event clock.
// MUST be false in production  -  when true, the LU page ignores real time and
// pins to TEST_DATE, which made every device show the wrong time.
const TEST_MODE = false
const TEST_DATE = new Date('2027-05-03T12:55:00')

// Use the device's local clock directly. Whatever time the TV / phone /
// laptop thinks it is, that's what we display. Simple and predictable.
function getCentralTime(): Date {
  if (TEST_MODE) {
    return TEST_DATE
  }
  return new Date()
}

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: true,
    timeZone: 'America/Chicago',
  })
}

function getWeatherIcon(weatherId: number, iconCode: string, size: "sm" | "md" | "lg" = "md") {
  const isDay = iconCode.endsWith('d')
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-12 w-12",
    lg: "h-24 w-24"
  }
  const iconClass = sizeClasses[size]

  if (weatherId >= 200 && weatherId < 300) {
    return <CloudLightning className={`${iconClass} lu-weather-storm`} />
  } else if (weatherId >= 300 && weatherId < 600) {
    return <CloudRain className={`${iconClass} lu-weather-rain`} />
  } else if (weatherId >= 600 && weatherId < 700) {
    return <Snowflake className={`${iconClass} lu-weather-snow`} />
  } else if (weatherId >= 700 && weatherId < 800) {
    return <Wind className={`${iconClass} lu-weather-wind`} />
  } else if (weatherId === 800) {
    return isDay ? <Sun className={`${iconClass} lu-weather-sun`} /> : <Sun className={`${iconClass} lu-weather-wind`} />
  } else if (weatherId > 800) {
    return isDay ? <CloudSun className={`${iconClass} lu-weather-wind`} /> : <Cloud className={`${iconClass} lu-weather-wind`} />
  }
  return <Cloud className={`${iconClass} lu-weather-wind`} />
}

// Per-view zoom levels persist in localStorage so each TV remembers its preferred
// size for each panel across reloads / view rotations.
// NOTE: bump the version suffix on this key whenever the underlying defaults
// change, so previously-saved zoom levels don't compound on top of new defaults
// and break the layout.
//   v1: viewport-scaled base (broken  -  overshooting at 1080p).
//   v2: reduced range.
//   v3: fixed 16px rem + zoom multiplier (1× default  -  too small for projection).
//   v4: starts at 1.75× by default and goes up to 4× so the page is readable
//       on classroom projectors / TVs across the room out of the box.
//   v5: defaults back to 1× per user request  -  they want to opt in to bigger
//       sizing per device rather than getting it automatically.
const ZOOM_STORAGE_KEY = "lu_view_zoom_v5"
const ZOOM_BASE_PX = 16          // browser default  -  Tailwind text-* sizes assume this
const ZOOM_DEFAULT = 1            // 100% out of the box; bump up per-view as needed
const ZOOM_MIN = 0.75
const ZOOM_MAX = 4
const ZOOM_STEP = 0.25

export default function LiveUpdatesPage() {
  const [currentView, setCurrentView] = useState<ViewType>("schedule")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isAutoRotating, setIsAutoRotating] = useState(true)
  const [viewZoom, setViewZoom] = useState<Record<string, number>>({})
  // Hide the bottom control bar for a cleaner TV display. Toggle with "H" key.
  const [showControls, setShowControls] = useState(true)

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
  const [currentTime, setCurrentTime] = useState(new Date())
  // Admin mode (?admin=1)  -  gates the ice cream challenge editor.
  // Without this flag, Stephen and Brian will not see any controls or hidden state.
  const [adminMode, setAdminMode] = useState(false)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      setAdminMode(params.get("admin") === "1")
    }
  }, [])
  
  // Data states
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [nowItem, setNowItem] = useState<ScheduleItem | null>(null)
  const [nextItem, setNextItem] = useState<ScheduleItem | null>(null)
  const [prevItem, setPrevItem] = useState<ScheduleItem | null>(null)
  const [nextMeal, setNextMeal] = useState<ScheduleItem | null>(null)
  const [upcomingToday, setUpcomingToday] = useState<ScheduleItem[]>([])
  const [upcomingAll, setUpcomingAll] = useState<ScheduleItem[]>([])
  const [volunteerSchedule, setVolunteerSchedule] = useState<VolunteerSchedule | null>(null)
  const [volunteerTimeSlot, setVolunteerTimeSlot] = useState<string>("")
  const [mealData, setMealData] = useState<MealData | null>(null)

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
    return views
  }, [hasVolunteerData, announcements.length])

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

  // On mount, check if we need to restore state after a deploy-reload.
  useEffect(() => {
    if (typeof window === "undefined") return

    // Restore view
    const savedView = sessionStorage.getItem(VIEW_RESTORE_KEY) as ViewType | null
    if (savedView) {
      sessionStorage.removeItem(VIEW_RESTORE_KEY)
      setCurrentView(savedView)
    }

    // Restore auto-rotate state
    const savedAutoRotate = sessionStorage.getItem(AUTO_ROTATE_RESTORE_KEY)
    if (savedAutoRotate !== null) {
      sessionStorage.removeItem(AUTO_ROTATE_RESTORE_KEY)
      setIsAutoRotating(savedAutoRotate === "true")
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
  }, [])

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

  // Fetch weather
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch('/api/weather')
        const data = await res.json()
        if (!data.error) setWeather(data)
      } catch {}
    }
    fetchWeather()
    const interval = setInterval(fetchWeather, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch("/api/announcements")
        const data = await res.json()
        if (data.announcements) {
          setAnnouncements(data.announcements)
        }
      } catch {}
    }
    fetchAnnouncements()
    const interval = setInterval(fetchAnnouncements, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

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
        const res = await fetch(url, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
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
        const nextAssembly = SCHEDULE_ITEMS.find((item) => {
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

        const res = await fetch(`/api/volunteer-schedule?date=${targetDateStr}&timeSlot=${encodeURIComponent(timeSlot)}`)
        const data = await res.json()
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
  }, [])

  // Update displayed time every second using the device's local clock.
  useEffect(() => {
    setCurrentTime(getCentralTime())
    const tick = setInterval(() => {
      setCurrentTime(getCentralTime())
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  // Calculate schedule
  useEffect(() => {
    const updateSchedule = () => {
      const centralNow = getCentralTime()
      const centralHour = centralNow.getHours()
      const centralMinute = centralNow.getMinutes()
      // Format date as YYYY-MM-DD
      const year = centralNow.getFullYear()
      const month = String(centralNow.getMonth() + 1).padStart(2, '0')
      const day = String(centralNow.getDate()).padStart(2, '0')
      const centralDateStr = `${year}-${month}-${day}`

      let current: ScheduleItem | null = null
      let next: ScheduleItem | null = null
      let prev: ScheduleItem | null = null
      let meal: ScheduleItem | null = null

      const currentMinutes = centralHour * 60 + centralMinute

      // Find current, prev, and next items
      for (let i = 0; i < SCHEDULE_ITEMS.length; i++) {
        const item = SCHEDULE_ITEMS[i]

        const itemStartMinutes = item.startHour * 60 + item.startMinute
        let itemEndMinutes: number
        if (item.endHour !== undefined && item.endMinute !== undefined) {
          itemEndMinutes = item.endHour * 60 + item.endMinute
        } else {
          itemEndMinutes = itemStartMinutes + 60
        }

        if (item.date < centralDateStr) {
          // From a previous day - keep updating prev so we end with the latest completed event
          prev = item
          continue
        }

        if (item.date === centralDateStr) {
          if (currentMinutes >= itemStartMinutes && currentMinutes < itemEndMinutes) {
            current = item
          } else if (itemEndMinutes <= currentMinutes) {
            // Already finished today - this is now the most recent prev
            prev = item
          } else if (itemStartMinutes > currentMinutes && !next) {
            next = item
          }
        } else if (item.date > centralDateStr && !next) {
          next = item
        }
      }

      // Find next meal
      for (const item of SCHEDULE_ITEMS) {
        if (!item.isMeal) continue
        if (item.date < centralDateStr) continue
        
        const itemStartMinutes = item.startHour * 60 + item.startMinute
        
        if (item.date === centralDateStr && itemStartMinutes > currentMinutes) {
          meal = item
          break
        } else if (item.date > centralDateStr) {
          meal = item
          break
        }
      }

      // If current item is a meal, use it as next meal too
      if (current?.isMeal && !meal) {
        meal = current
      }

      // Get all remaining events for today
      const todayUpcoming: ScheduleItem[] = []
      for (const item of SCHEDULE_ITEMS) {
        if (item.date !== centralDateStr) continue
        const itemStartMinutes = item.startHour * 60 + item.startMinute
        if (itemStartMinutes > currentMinutes) {
          todayUpcoming.push(item)
        }
      }

      // Get all upcoming events (including future days)
      const allUpcoming: ScheduleItem[] = []
      for (const item of SCHEDULE_ITEMS) {
        if (item.date < centralDateStr) continue
        if (item.date === centralDateStr) {
          const itemStartMinutes = item.startHour * 60 + item.startMinute
          if (itemStartMinutes > currentMinutes) {
            allUpcoming.push(item)
          }
        } else {
          allUpcoming.push(item)
        }
      }

      setNowItem(current)
      setNextItem(next)
      setPrevItem(prev)
      setNextMeal(meal)
      setUpcomingToday(todayUpcoming)
      setUpcomingAll(allUpcoming)
    }

    updateSchedule()
    const interval = setInterval(updateSchedule, 1000)
    return () => clearInterval(interval)
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

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Auto-rotate
  useEffect(() => {
    if (!isAutoRotating) return
    
    const interval = setInterval(() => {
      setCurrentView(prev => {
        const currentIndex = availableViews.indexOf(prev)
        const nextIndex = (currentIndex + 1) % availableViews.length
        return availableViews[nextIndex]
      })
    }, 15000)

    return () => clearInterval(interval)
  }, [isAutoRotating, availableViews])

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
        case "0":
        case "a":
        case "A":
          setIsAutoRotating(prev => !prev)
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
  }, [toggleFullscreen, availableViews, announcements.length, hasVolunteerData])

  // Format current date/time using the device's local clock. We format
  // manually (from getHours/getMinutes/getDay) instead of toLocaleString so
  // older smart-TV browsers don't render unexpected locale variants.
  const _hours24 = currentTime.getHours()
  const _minutes = currentTime.getMinutes()
  const _ampm = _hours24 >= 12 ? 'PM' : 'AM'
  const _hours12 = _hours24 % 12 === 0 ? 12 : _hours24 % 12
  const formattedTime = `${_hours12}:${String(_minutes).padStart(2, '0')}  ${_ampm}`

  const _weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const _months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December']
  const formattedDate = `${_weekdays[currentTime.getDay()]}, ${_months[currentTime.getMonth()]} ${currentTime.getDate()}`

  return (
    <div className="live-updates-shell h-screen max-h-screen overflow-hidden flex flex-col text-[oklch(0.96_0.01_178)]">
      {/* Header  -  kept minimal: a tiny logo + the clock. Everything else
          (WiFi, branding tagline, etc.) was removed so the views below get
          maximum vertical space and aren't competing with header noise. */}
      <header className="shrink-0 flex items-center justify-between gap-6 px-8 py-4 border-b border-primary/20">
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
          <h1 className="text-xl font-bold tracking-wide whitespace-nowrap">
            RENDEZVOUS 2027
          </h1>
        </div>

        <div className="text-right shrink-0">
          <div className="text-4xl font-light tracking-wider tabular-nums leading-none">{formattedTime}</div>
          <div className="text-white/60 text-base mt-1 whitespace-nowrap">{formattedDate}</div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1 p-12 flex items-center justify-center overflow-hidden">
        <ViewTransition viewKey={currentView} className="w-full h-full flex items-center justify-center">
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
            <ScheduleView nowItem={nowItem} nextItem={nextItem} upcomingToday={upcomingToday} upcomingAll={upcomingAll} />
          )}
          {currentView === "meal" && (
            <MealView nextMeal={nextMeal} mealData={mealData} adminMode={adminMode} />
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
        </ViewTransition>
      </main>

      {/* Keyboard Controls Footer - hidden in fullscreen or when controls are hidden (press H to toggle) */}
      {!isFullscreen && showControls && (
      <footer className="shrink-0 border-t border-primary/20 px-12 py-6">
        <p className="mb-4 text-center text-sm text-white/50">Number keys switch views on a connected keyboard.</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <KeyButton shortcut="1" name="All" active={currentView === "all"} />
          <KeyButton shortcut="2" name="Weather" active={currentView === "weather"} />
          <KeyButton shortcut="3" name="Schedule" active={currentView === "schedule"} />
          <KeyButton shortcut="4" name="Meal" active={currentView === "meal"} />
          <KeyButton shortcut="5" name="Map" active={currentView === "map"} />
          {hasVolunteerData && (
            <KeyButton shortcut="6" name="Volunteers" active={currentView === "volunteers"} />
          )}
          {announcements.length > 0 && (
            <KeyButton shortcut="7" name="Announcements" active={currentView === "announcements"} />
          )}
          <KeyButton shortcut="8" name="WiFi" active={currentView === "wifi"} />
          <KeyButton shortcut="9" name="Up next" active={currentView === "upcoming"} />
          <KeyButton shortcut="0" name="Auto rotate" active={isAutoRotating} />
          <KeyButton shortcut="F" name="Fullscreen" active={isFullscreen} />

          {/* Per-view zoom controls  -  saved to localStorage so each TV
              remembers its preferred size for each panel. The widget is
              intentionally larger / brighter than the keyboard hints so it's
              easy to find on a projection screen. The label includes the
              current view name so it's obvious that resizing is per-page. */}
          <div className="ml-2 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2">
            <span className="mr-1 text-base font-semibold text-primary">{currentView} size</span>
            <button
              type="button"
              onClick={zoomOut}
              disabled={currentZoom <= ZOOM_MIN + 0.001}
              className="flex items-center justify-center h-12 w-12 rounded-lg border border-white/20 bg-white/[0.06] hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg"
              aria-label="Decrease size"
              title="Decrease size"
            >
              <ZoomOut className="h-6 w-6" />
            </button>
            <span className="text-white text-xl tabular-nums w-20 text-center font-bold">
              {Math.round(currentZoom * 100)}%
            </span>
            <button
              type="button"
              onClick={zoomIn}
              disabled={currentZoom >= ZOOM_MAX - 0.001}
              className="flex items-center justify-center h-12 w-12 rounded-lg border border-white/20 bg-white/[0.06] hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg"
              aria-label="Increase size"
              title="Increase size"
            >
              <ZoomIn className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              disabled={Math.abs(currentZoom - ZOOM_DEFAULT) < 0.001}
              className="flex items-center justify-center h-12 w-12 rounded-lg border border-white/20 bg-white/[0.06] hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Reset size"
              title="Reset size"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>

          {isAutoRotating && (
            <span className="lu-text-now text-sm flex items-center gap-2 ml-4">
              <span className="w-2 h-2 lu-bg-now rounded-full" />
              Auto-rotating
            </span>
          )}
        </div>
      </footer>
      )}
    </div>
  )
}

function KeyButton({ name, shortcut, active }: { name: string; shortcut?: string; active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-base font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/80 hover:bg-white/20"
      }`}
    >
      {shortcut ? (
        <kbd className="rounded border border-white/15 bg-white/10 px-1.5 py-0.5 font-mono text-xs opacity-80">
          {shortcut}
        </kbd>
      ) : null}
      {name}
    </span>
  )
}

// Schedule Card - shows up to 5 events (includes future days if today is empty)
function ScheduleCard({ 
  nowItem, 
  nextItem, 
  upcomingToday,
  upcomingAll
}: { 
  nowItem: ScheduleItem | null
  nextItem: ScheduleItem | null
  upcomingToday: ScheduleItem[]
  upcomingAll: ScheduleItem[]
}) {
  // Combine now + upcoming, limit to 5
  const eventsToShow: { item: ScheduleItem; isNow: boolean }[] = []
  
  if (nowItem) {
    eventsToShow.push({ item: nowItem, isNow: true })
  }
  
  // Use upcomingAll to include future days if today has no events
  const upcoming = upcomingToday.length > 0 ? upcomingToday : upcomingAll
  
  for (const item of upcoming) {
    if (eventsToShow.length >= 5) break
    // Don't duplicate if already in the list
    if (!eventsToShow.some(e => e.item === item)) {
      eventsToShow.push({ item, isNow: false })
    }
  }

  return (
    <div className="group relative overflow-hidden lu-panel p-7">
      <div className="relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-xl bg-primary/10 p-2.5 border border-primary/20">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm uppercase tracking-[0.12em] font-semibold text-primary/90">Schedule</span>
        </div>
        <div className="space-y-2.5">
          {eventsToShow.length > 0 ? (
            eventsToShow.map(({ item, isNow }, index) => (
              <div 
                key={index}
                className={`p-3.5 rounded-xl border transition-colors ${
                  isNow 
                    ? "lu-surface-now border lu-border-now" 
                    : item === nextItem
                    ? "bg-white/[0.07] border-white/15"
                    : "bg-white/[0.03] border-white/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    {isNow && <LuNowDot />}
                    {getEventIcon(item.title, item.isMeal, "xs")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base leading-tight truncate">{item.title}</p>
                    <p className={`text-sm mt-0.5 ${isNow ? "lu-text-now font-semibold uppercase tracking-wider" : "text-white/50"}`}>
                      {isNow ? "Now" : `${item.day} ${item.time}`}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-white/50 text-sm">No upcoming events</p>
          )}
        </div>
      </div>
    </div>
  )
}

// All View - dashboard with cards
function AllView({ 
  weather, 
  nowItem, 
  nextItem, 
  nextMeal,
  upcomingToday,
  upcomingAll,
  volunteerSchedule,
  volunteerTimeSlot
}: { 
  weather: WeatherData | null
  nowItem: ScheduleItem | null
  nextItem: ScheduleItem | null
  nextMeal: ScheduleItem | null
  upcomingToday: ScheduleItem[]
  upcomingAll: ScheduleItem[]
  volunteerSchedule: VolunteerSchedule | null
  volunteerTimeSlot: string
}) {
  // Check if volunteer schedule has any filled items
  const volunteerItems: { label: string; value: string | null; subtitle?: string | null }[] = volunteerSchedule ? [
    { label: "Opening Prayer", value: volunteerSchedule.openingPrayer },
    { label: "Leading Singing [A]", value: volunteerSchedule.leadingSingingA },
    { label: "Leading Singing [B]", value: volunteerSchedule.leadingSingingB },
    { label: "Reading Scripture [A]", value: volunteerSchedule.readingScriptureA, subtitle: volunteerSchedule.lessonScriptureA },
    { label: "Presenting [A]", value: volunteerSchedule.presentingLessonA, subtitle: volunteerSchedule.lessonTitleA },
    { label: "Reading Scripture [B]", value: volunteerSchedule.readingScriptureB, subtitle: volunteerSchedule.lessonScriptureB },
    { label: "Presenting [B]", value: volunteerSchedule.presentingLessonB, subtitle: volunteerSchedule.lessonTitleB },
    { label: "Closing Prayer", value: volunteerSchedule.closingPrayer },
  ].filter(item => item.value) : []

  const hasVolunteers = volunteerItems.length > 0

  // Featured event - prefer "now" then "next"
  const featuredItem = nowItem || nextItem
  const featuredIsNow = !!nowItem

  return (
    <div className="relative w-full h-full mx-auto flex flex-col overflow-hidden">
      {/* HERO BANNER - Logo, tagline, featured event */}
      <div className="relative mb-6 shrink-0 overflow-hidden lu-panel">
        <div className="relative grid grid-cols-12 gap-6 p-6">
          {/* Left: Logo + Tagline */}
          <div className="col-span-5 flex flex-col items-center justify-center text-center">
            <div className="relative mb-3">
              <Image
                src="/rendezvous-logo.png"
                alt="Rendezvous Homeschool Family Retreat"
                width={400}
                height={400}
                className="h-32 w-auto brightness-0 invert"
                priority
              />
            </div>
            <div className="inline-flex items-center gap-3">
              <span className="lu-kicker text-primary">2027</span>
            </div>
          </div>

          {/* Right: Featured event spotlight */}
          <div className="col-span-7 flex flex-col justify-center">
            {featuredItem ? (
              <div className="relative lu-panel-soft p-6">
                <div className="flex items-center gap-3 mb-4">
                  {featuredIsNow ? (
                    <>
                      <LuNowDot size="md" />
                      <span className="lu-kicker lu-text-now">Happening now</span>
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-5 w-5 lu-text-upcoming" />
                      <span className="text-sm font-semibold uppercase tracking-[0.12em] lu-text-upcoming">Up Next</span>
                    </>
                  )}
                </div>
                <div className="flex items-start gap-6">
                  <div className="shrink-0 rounded-2xl bg-white/5 border border-primary/20 p-4">
                    {getEventIcon(featuredItem.title, featuredItem.isMeal, "lg")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-4xl font-bold leading-tight mb-3 text-balance">{featuredItem.title}</h2>
                    <div className="flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-primary/20 text-base">
                        <Clock className="h-4 w-4 lu-text-upcoming" />
                        {featuredIsNow ? featuredItem.time : `${featuredItem.day} ${featuredItem.time}`}
                      </span>
                      {featuredItem.location && (
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-primary/20 text-base">
                          <MapPin className="h-4 w-4 lu-text-upcoming" />
                          {featuredItem.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-primary/20 bg-white/[0.03] p-8 text-center">
                <Bed className="h-16 w-16 text-white/30 mx-auto mb-4" />
                <p className="text-2xl font-semibold text-white/60">Free Time</p>
                <p className="text-base text-white/40 mt-2">Enjoy the retreat!</p>
              </div>
            )}
          </div>
        </div>

        {/* Decorative bottom stripe */}
      </div>

      {/* CARDS GRID */}
      <div className={`grid grid-cols-1 gap-6 flex-1 min-h-0 ${hasVolunteers ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {/* Weather Card */}
        <div className="group relative overflow-hidden lu-panel p-7">
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl lu-pin-lake-surface p-2.5 border lu-pin-lake-border">
                <Droplets className="h-5 w-5 lu-text-schedule" />
              </div>
              <span className="text-sm uppercase tracking-[0.12em] font-semibold lu-text-schedule opacity-90">Weather</span>
            </div>
            {weather ? (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  {getWeatherIcon(weather.current.weather[0].id, weather.current.weather[0].icon, "md")}
                  <span className="text-6xl font-bold tabular-nums">{Math.round(weather.current.temp)}°</span>
                </div>
                <p className="text-white/70 capitalize text-lg">{weather.current.weather[0].description}</p>
                <div className="grid grid-cols-3 gap-2">
                  {weather.hourly.slice(0, 3).map((hour) => (
                    <div key={hour.dt} className="text-center p-3 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-xs text-white/50 font-medium">{formatTime(hour.dt)}</p>
                      <div className="flex justify-center my-2">
                        {getWeatherIcon(hour.weather[0].id, hour.weather[0].icon, "sm")}
                      </div>
                      <p className="font-bold text-base tabular-nums">{Math.round(hour.temp)}°</p>
                      {hour.pop > 0.1 && (
                        <p className="text-xs lu-text-schedule flex items-center justify-center gap-1 mt-0.5">
                          <Droplets className="h-3 w-3" />
                          {Math.round(hour.pop * 100)}%
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-white/50 text-lg">Loading weather...</p>
            )}
          </div>
        </div>

        {/* Schedule Card */}
        <ScheduleCard nowItem={nowItem} nextItem={nextItem} upcomingToday={upcomingToday} upcomingAll={upcomingAll} />

        {/* Next Meal Card */}
        <div className="group relative overflow-hidden lu-panel p-7">
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl lu-priority-normal-surface p-2.5 border lu-pin-warm-border">
                <UtensilsCrossed className="h-5 w-5 lu-text-meal" />
              </div>
              <span className="text-sm uppercase tracking-[0.12em] font-semibold lu-text-meal opacity-90">Next Meal</span>
            </div>
            {nextMeal ? (
              <div className="flex flex-col items-center justify-center text-center pt-2">
                <div className="mb-4 rounded-2xl bg-white/5 border border-primary/20 p-4">
                  {getEventIcon(nextMeal.title, true, "lg")}
                </div>
                <h3 className="text-2xl font-bold mb-3">{nextMeal.title}</h3>
                <p className="text-white/70 text-lg flex items-center justify-center gap-2 mb-2">
                  <Clock className="h-4 w-4 lu-text-meal" />
                  {nextMeal.time}
                </p>
                {nextMeal.location && (
                  <p className="text-white/50 text-sm flex items-center justify-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {nextMeal.location}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center pt-4">
                <UtensilsCrossed className="h-16 w-16 text-white/30 mb-4" />
                <p className="text-white/50 text-lg">No upcoming meals</p>
              </div>
            )}
          </div>
        </div>

        {/* Volunteer Schedule Card */}
        {hasVolunteers && (
          <div className="group relative overflow-hidden lu-panel p-7">
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-xl lu-pin-coral-surface p-2.5 border lu-pin-coral-border">
                  <Users className="h-5 w-5 lu-pin-coral-text" />
                </div>
                <span className="text-sm uppercase tracking-[0.12em] font-semibold lu-pin-coral-text opacity-90 truncate">{volunteerTimeSlot}</span>
              </div>
              <div className="space-y-2.5">
                {volunteerItems.map((item, index) => (
                  <div key={index} className="text-sm">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-0.5">{item.label}</p>
                    <p className="font-semibold text-base text-white">{item.value}</p>
                    {item.subtitle && (
                      <p className="text-white/50 italic text-xs mt-0.5">{item.subtitle}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Weather View - Full screen weather
// Weather View  -  minimal: just temp, condition, and a single line of secondary
// stats (humidity + wind). The hourly forecast strip and the lengthy welcome
// greeting were removed so the temp can be HUGE on TVs/projectors.
// Wifi View  -  minimal full-screen panel showing only the network name and
// password in extra-large monospaced text so attendees can read it from the
// back of the room. Mirrors the styling language of the other LU views
// (rounded glow card, ambient orbs) but hard-leans on legibility.
function WifiView() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-full max-w-5xl lu-panel p-12 text-center">
        <div className="relative flex flex-col items-center">
          <div className="mb-8 rounded-3xl lu-pin-lake-surface border lu-pin-lake-border p-6">
            <Wifi className="h-20 w-20 lu-text-schedule" />
          </div>

          <p className="text-3xl uppercase tracking-[0.12em] font-semibold lu-text-schedule opacity-90 mb-10">
            Free WiFi
          </p>

          <div className="w-full max-w-3xl space-y-6">
            <div className="rounded-2xl border border-white/15 bg-white/[0.04] px-8 py-6">
              <p className="text-2xl uppercase tracking-[0.12em] font-bold text-white/50 mb-3">
                Network
              </p>
              <p className="text-7xl font-mono font-bold leading-none tracking-wide">
                LWCC
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/[0.04] px-8 py-6">
              <p className="text-2xl uppercase tracking-[0.12em] font-bold text-white/50 mb-3">
                Password
              </p>
              <p className="text-7xl font-mono font-bold leading-none tracking-wide">
                wifi4lwcc
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Upcoming View  -  shows the next 3 events in large, readable cards.
// Uses the same upcomingToday / upcomingAll data the ScheduleView has access
// to, so the list is consistent with the now/next logic elsewhere.
function UpcomingView({
  nowItem,
  upcomingToday,
  upcomingAll,
}: {
  nowItem: ScheduleItem | null
  upcomingToday: ScheduleItem[]
  upcomingAll: ScheduleItem[]
}) {
  // Build a list of up to 3 upcoming events. If something is happening now,
  // include it as the first item with a "now" badge. Fill the rest from
  // upcomingToday (or upcomingAll if today is empty).
  const upcoming = upcomingToday.length > 0 ? upcomingToday : upcomingAll
  const events: { item: ScheduleItem; isNow: boolean }[] = []

  if (nowItem) {
    events.push({ item: nowItem, isNow: true })
  }
  for (const item of upcoming) {
    if (events.length >= 3) break
    // Skip if it's the same as nowItem (already added)
    if (nowItem && item.title === nowItem.title && item.time === nowItem.time && item.date === nowItem.date) continue
    events.push({ item, isNow: false })
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      <div className="relative w-full max-w-6xl lu-panel p-10">
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="rounded-2xl lu-pin-lake-surface p-4 border lu-pin-lake-border">
              <Calendar className="h-10 w-10 lu-text-schedule" />
            </div>
            <h2 className="text-5xl font-bold">Up Next</h2>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12">
              <Bed className="h-24 w-24 text-white/30 mx-auto mb-6" />
              <p className="text-4xl font-semibold text-white/50">No upcoming events</p>
            </div>
          ) : (
            <div className="space-y-5">
              {events.map(({ item, isNow }, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-6 p-6 rounded-2xl border transition-colors ${
                    isNow
                      ? "lu-surface-now border lu-border-now"
                      : "bg-white/[0.03] border-white/10"
                  }`}
                >
                  {/* Icon */}
                  <div className="shrink-0">
                    {getEventIcon(item.title, item.isMeal, "lg", isNow ? LU_ICON.now : LU_ICON.schedule)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-2">
                      {isNow && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full lu-surface-now border lu-border-now">
                          <LuNowDot size="md" />
                          <span className="text-lg font-semibold uppercase tracking-wider lu-text-now">Now</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-4xl font-bold leading-tight text-balance mb-2">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-6 text-2xl text-white/70">
                      <span className="flex items-center gap-2">
                        <Clock className="h-6 w-6 lu-text-schedule opacity-70" />
                        {item.day} {item.time}
                      </span>
                      {item.location && (
                        <span className="flex items-center gap-2">
                          <MapPin className="h-6 w-6 lu-text-schedule opacity-70" />
                          {item.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function WeatherView({ weather }: { weather: WeatherData | null }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-full max-w-5xl lu-panel p-12">
        <div className="relative flex flex-col items-center justify-center">
          {!weather ? (
            <p className="text-white/50 text-3xl">Loading weather...</p>
          ) : (
            <>
              <div className="flex items-center gap-12 mb-6">
                {getWeatherIcon(weather.current.weather[0].id, weather.current.weather[0].icon, "lg")}
                <span className="text-[12rem] font-light leading-none tabular-nums">
                  {Math.round(weather.current.temp)}°
                </span>
              </div>

              <p className="text-5xl text-white/85 capitalize mb-10 text-center text-balance">
                {weather.current.weather[0].description}
              </p>

              <div className="flex items-center gap-16 text-3xl text-white/70">
                <span className="flex items-center gap-3">
                  <Droplets className="h-9 w-9 lu-text-schedule" />
                  {weather.current.humidity}%
                </span>
                <span className="flex items-center gap-3">
                  <Wind className="h-9 w-9 lu-text-schedule" />
                  {Math.round(weather.current.wind_speed)} mph
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Schedule View  -  minimal: just shows ONE thing at a time.
//   - "Happening Now" if there's an active event
//   - else "Up Next" if there's a future event
//   - else a friendly idle state
// Sidebar lists, "Today's Schedule" rolls, and any other secondary info were
// removed so the single visible event can use the full width and the largest
// possible text. Auto-rotation cycles to other views (Weather, Meal, etc.) so
// users still see additional context without us cramming the schedule page.
function ScheduleView({
  nowItem,
  nextItem,
}: {
  nowItem: ScheduleItem | null
  nextItem: ScheduleItem | null
  // Accept (and ignore) the legacy upcoming props so the parent call site
  // doesn't need to change. Marked optional so TS doesn't complain.
  upcomingToday?: ScheduleItem[]
  upcomingAll?: ScheduleItem[]
}) {
  const showNow = !!nowItem
  const showNext = !nowItem && !!nextItem
  const item = nowItem ?? nextItem

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Ambient violet glow orbs */}


      <div className="relative w-full max-w-6xl lu-panel p-12 text-center">
{item ? (
          <div className="relative">
            {/* Status label  -  Now or Up Next */}
            <div className="flex items-center justify-center gap-4 mb-10">
              {showNow ? (
                <>
                  <LuNowDot size="lg" />
                  <span className="text-3xl font-semibold uppercase tracking-[0.12em] lu-text-now">Happening Now</span>
                </>
              ) : (
                <>
                  <ChevronRight className="h-9 w-9 text-primary" />
                  <span className="text-3xl font-bold uppercase tracking-[0.12em] text-primary">Up Next</span>
                </>
              )}
            </div>

            <div className="flex justify-center mb-8">
              {getEventIcon(item.title, item.isMeal, "xl")}
            </div>

            <h2 className="text-7xl font-bold mb-6 text-balance leading-tight">
              {item.title}
            </h2>

            <p className="text-5xl text-white/85 mb-4">
              {showNext && item === nextItem ? `${item.day} ` : ""}{item.time}
            </p>

            {item.location && (
              <p className="text-3xl text-white/60 flex items-center justify-center gap-3 mt-6">
                <MapPin className="h-9 w-9 text-primary" />
                {item.location}
              </p>
            )}
          </div>
        ) : (
          <div className="relative">
            <Bed className="h-32 w-32 text-white/30 mx-auto mb-6" />
            <h2 className="text-6xl font-bold text-white/60">No Scheduled Events</h2>
            <p className="text-3xl text-white/40 mt-4">Enjoy your free time!</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Meal View  -  the menu IS the hero.
// Layout (top → bottom): small meal-type chip, GIANT menu text, small time.
// Earlier versions led with the meal title ("Breakfast") at text-7xl which
// pushed the actual food info below the fold and made it the dominant element
//  -  exactly the wrong priority for a sign telling people what to expect on
// the table. The food now uses the largest type on screen.
function MealView({
  nextMeal,
  mealData,
}: {
  nextMeal: ScheduleItem | null
  mealData: MealData | null
  // Accept (and ignore) the legacy adminMode prop so the parent call site
  // doesn't need to change.
  adminMode?: boolean
}) {
  // Always use "Next Meal" as the leading label. Earlier versions tried to
  // be clever with "This Morning" / "Tonight" phrases, but those read wrong
  // when checked at the wrong time of day (e.g. seeing "This Morning ·
  // Breakfast" at 11 PM the night before). "Next Meal" is unambiguous in
  // every timeline scenario.
  const mealLabel = "Next Meal"

  // Strip dietary parentheticals like "(GF)", "(DF, GF)", "(V)", "(GF/DF)"
  // from any menu text. Per the kitchen team, those tags clutter the LU
  // display  -  anyone with dietary needs already has them on a printed sheet
  //  -  so we render clean dish names only.
  const stripDietaryTags = (s: string) =>
    s
      .replace(/\s*\(\s*(?:GF|DF|V|VG|VEGAN|VEGETARIAN|N|NF|SF|EF)(?:\s*[,/&]\s*(?:GF|DF|V|VG|VEGAN|VEGETARIAN|N|NF|SF|EF))*\s*\)/gi, "")
      .replace(/\s+/g, " ")
      .trim()

  const cleanMain = mealData?.main_dish ? stripDietaryTags(mealData.main_dish) : ""
  const cleanSides =
    mealData?.sides && mealData.sides.length > 0
      ? mealData.sides.map(stripDietaryTags).filter(Boolean)
      : []
  const hasMenu = !!cleanMain || cleanSides.length > 0

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      {/* Ambient amber glow orbs */}


      <div className="relative w-full max-w-6xl lu-panel p-12 text-center">
{!nextMeal ? (
          <div className="relative flex flex-col items-center">
            <UtensilsCrossed className="h-32 w-32 text-white/30 mb-6" />
            <h2 className="text-5xl font-bold text-white/60">No Upcoming Meals</h2>
          </div>
        ) : (
          <div className="relative flex flex-col items-center">
            {/* Top: small label chip combining the time-of-day phrase and meal
                type ("Tonight • Dinner"). Intentionally small so the menu
                content below is the dominant element. */}
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border lu-pin-warm-border lu-priority-normal-surface mb-8">
              {getEventIcon(nextMeal.title, true, "sm")}
              <span className="text-2xl uppercase tracking-[0.12em] font-bold lu-text-meal opacity-90">
                {mealLabel} · {nextMeal.title}
              </span>
            </div>

            {/* Hero: the menu itself. Main dish at the top in the largest
                possible type; sides on a single line below at a step smaller
                so the visual hierarchy reads instantly from across the room. */}
            {hasMenu ? (
              <div className="mb-10 max-w-5xl">
                {cleanMain && (
                  <p className="text-8xl font-bold leading-[1.05] text-balance">
                    {cleanMain}
                  </p>
                )}
                {cleanSides.length > 0 && (
                  <p
                    className={
                      cleanMain
                        ? "mt-6 text-4xl text-white/75 leading-snug text-balance"
                        : "text-7xl font-semibold leading-tight text-balance"
                    }
                  >
                    {cleanMain && (
                      <span className="lu-text-meal opacity-70 mr-2">with</span>
                    )}
                    {cleanSides.join(", ")}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-5xl font-semibold text-white/40 mb-10">
                Menu coming soon
              </p>
            )}

            {/* Bottom: serving time, de-emphasized. */}
            <p className="text-3xl text-white/60 flex items-center gap-3">
              <Clock className="h-8 w-8 lu-text-meal opacity-70" />
              Served at {nextMeal.time}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Map View - Shows the venue map with current/next event location highlighted
function MapView({ 
  nowItem, 
  nextItem, 
  prevItem 
}: { 
  nowItem: ScheduleItem | null
  nextItem: ScheduleItem | null
  prevItem: ScheduleItem | null
}) {
  // Prefer current event, fall back to next
  const featuredItem = nowItem || nextItem
  const isHappeningNow = !!nowItem
  const featuredLocationId = getLocationIdForEvent(featuredItem)
  const featuredLocation = featuredLocationId 
    ? mapLocations.find(l => l.id === featuredLocationId) 
    : null

  // Find the previous location (where you're coming from)
  const prevLocationId = getLocationIdForEvent(prevItem)
  const prevLocation = prevLocationId && prevLocationId !== featuredLocationId
    ? mapLocations.find(l => l.id === prevLocationId)
    : null

  // Try to find a path between prev and featured location.
  // Paths are defined in either direction, so check both and reverse if needed.
  let routePoints: { x: number; y: number }[] | null = null
  let routeColor = "#f97316"
  if (prevLocationId && featuredLocationId && prevLocationId !== featuredLocationId) {
    const path = mapPaths.find(p => {
      const endpoints = p.points.filter(pt => pt.pinId).map(pt => pt.pinId)
      return endpoints.includes(prevLocationId) && endpoints.includes(featuredLocationId)
    })
    if (path) {
      const firstPin = path.points.find(pt => pt.pinId)?.pinId
      const points = firstPin === prevLocationId ? path.points : [...path.points].reverse()
      routePoints = points.map(pt => ({ x: pt.x, y: pt.y }))
      // Use the featured location's color for the route to reinforce the destination
    }
  }

  const cc = featuredLocation
    ? luPinStyle(featuredLocation.color, featuredLocation.category)
    : LU_PIN_COLORS.orange
  
  if (featuredLocation) {
    routeColor = cc.hex
  }

  return (
    <div className="relative w-full h-full flex gap-6">
      {/* Ambient glow orbs - matched to destination color */}


      {/* Left side - Event info card */}
      <div className="w-[26rem] shrink-0 flex flex-col">
        <div className={`flex-1 relative overflow-hidden lu-panel p-7 flex flex-col justify-center`}>
          <div className="relative">
            {featuredItem ? (
              <>
                <div className="flex items-center gap-3 mb-5">
                  {isHappeningNow ? (
                    <>
                      <LuNowDot size="md" />
                      <span className="lu-kicker lu-text-now">Happening now</span>
                    </>
                  ) : (
                    <>
                      <ChevronRight className={`h-5 w-5 ${cc.icon}`} />
                      <span className={`lu-kicker ${cc.text}`}>Up next</span>
                    </>
                  )}
                </div>
                <div className="mb-5">
                  {/* Icon recolored to match destination pin */}
                  {getEventIcon(featuredItem.title, featuredItem.isMeal, "lg", cc.icon)}
                </div>
                <h2 className="text-3xl font-bold mb-2 leading-tight text-balance">{featuredItem.title}</h2>
                <p className="text-xl text-white/70 mb-1">
                  {isHappeningNow ? featuredItem.time : `${featuredItem.day} ${featuredItem.time}`}
                </p>
                {prevLocation && routePoints && (
                  <div className="mt-5 p-3.5 rounded-xl bg-white/5 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center pt-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                        <div className="w-px h-5 bg-white/20 my-1" />
                        <ChevronRight className={`h-4 w-4 ${cc.icon} rotate-90`} />
                      </div>
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-0.5">Coming From</p>
                        <p className="text-base font-medium text-white/80 leading-tight">{prevLocation.name}</p>
                      </div>
                    </div>
                  </div>
                )}
                {featuredLocation && (
                  <div className={`mt-3 p-4 rounded-xl lu-panel-inner border ${cc.border}`}>
                    <div className="flex items-start gap-3">
                      <MapPin className={`h-6 w-6 ${cc.icon} shrink-0 mt-1`} fill="currentColor" />
                      <div>
                        <p className={`${cc.text} text-xs uppercase tracking-[0.2em] font-bold mb-1`}>
                          {prevLocation && routePoints ? "Heading To" : "Location"}
                        </p>
                        <p className="text-xl font-semibold leading-tight">{featuredLocation.name}</p>
                        {featuredLocation.description && (
                          <p className="text-white/60 text-sm mt-1.5 leading-snug">{featuredLocation.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <Bed className="h-24 w-24 text-white/30 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white/60">No Active Events</h2>
                <p className="text-lg text-white/40 mt-2">Free time at the venue</p>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 px-2 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <MapPin className="h-3.5 w-3.5 lu-pin-coral" fill="currentColor" />
            <span>Meeting</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <MapPin className="h-3.5 w-3.5 lu-pin-warm" fill="currentColor" />
            <span>Dining</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <MapPin className="h-3.5 w-3.5 lu-pin-ink" fill="currentColor" />
            <span>Activity</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <MapPin className="h-3.5 w-3.5 lu-pin-lake" fill="currentColor" />
            <span>Lodging</span>
          </div>
        </div>
      </div>

      {/* Right side - Venue map */}
      <div className={`flex-1 relative lu-panel flex items-center justify-center p-3 pt-14 min-h-0`}>
        {/* Aspect-ratio wrapper. NOTE: no overflow-hidden so the pin's floating name label can render above the map for pins near the top edge. The image itself has rounded corners so the visual still looks clean. */}
        <div
          className="relative"
          style={{
            width: "100%",
            aspectRatio: "4 / 3",
            maxHeight: "100%",
            maxWidth: "100%",
          }}
        >
          <img
            src="/images/venue-map.jpg"
            alt="Lake Williamson venue map"
            className="absolute inset-0 w-full h-full rounded-lg"
            draggable={false}
          />

          {/* Route path overlay - shown when there's a known path from prev → featured */}
          {routePoints && routePoints.length >= 2 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ zIndex: 5 }}
            >
              <defs>
                <marker
                  id="route-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={routeColor} />
                </marker>
              </defs>
              {/* Subtle white halo behind the route for contrast on the colorful map */}
              <polyline
                points={routePoints.map(p => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.7"
                vectorEffect="non-scaling-stroke"
                style={{ strokeWidth: 8 }}
              />
              {/* Animated dashed colored route */}
              <polyline
                points={routePoints.map(p => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={routeColor}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                markerEnd="url(#route-arrow)"
                style={{ 
                  strokeWidth: 5,
                  strokeDasharray: "8 6",
                  animation: "route-dash 1.2s linear infinite",
                }}
              />
              <style>{`
                @keyframes route-dash {
                  to { stroke-dashoffset: -14; }
                }
              `}</style>
            </svg>
          )}

          {/* Pins overlay - positioned as % of the wrapper, which equals image pixels */}
          {mapLocations.map((location) => {
            const isFeatured = location.id === featuredLocationId
            const isPrev = location.id === prevLocationId && location.id !== featuredLocationId && !!routePoints
            const pinStyle = luPinStyle(location.color, location.category)
            const hex = pinStyle.hex
            
            return (
              <div
                key={location.id}
                className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
                style={{ 
                  left: `${location.x}%`, 
                  top: `${location.y}%`,
                  zIndex: isFeatured ? 20 : isPrev ? 15 : 10,
                }}
              >
                {isFeatured && (
                  <div 
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full"
                    style={{ backgroundColor: hex, opacity: 0.28 }}
                  />
                )}
                {isPrev && (
                  <div 
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-2 border-white/70 bg-white/30"
                  />
                )}
                <MapPin
                  className={`relative drop-shadow-lg transition-all ${
                    isFeatured ? "h-14 w-14" 
                    : isPrev ? "h-10 w-10" 
                    : "h-7 w-7 opacity-70"
                  }`}
                  style={{ color: isPrev ? "#ffffff" : hex }}
                  fill={isFeatured ? hex : isPrev ? "#9ca3af" : "white"}
                  strokeWidth={2}
                />
                {isFeatured && (
                  <div 
                    className="absolute left-1/2 -translate-x-1/2 -top-12 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap shadow-xl"
                    style={{ backgroundColor: hex, color: "white" }}
                  >
                    {location.name}
                  </div>
                )}
                {isPrev && (
                  <div 
                    className="absolute left-1/2 -translate-x-1/2 -top-9 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shadow-lg bg-white/90 text-black/80"
                  >
                    {location.name}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Volunteers View - Shows devotional schedule for current time slot
function VolunteersView({ 
  volunteerSchedule, 
  volunteerTimeSlot 
}: { 
  volunteerSchedule: VolunteerSchedule | null
  volunteerTimeSlot: string
}) {
  const roles = volunteerSchedule ? [
    { label: "Opening Prayer", value: volunteerSchedule.openingPrayer },
    { label: "Leading Singing [A]", value: volunteerSchedule.leadingSingingA },
    { label: "Leading Singing [B]", value: volunteerSchedule.leadingSingingB },
    { label: "Reading Scripture [A]", value: volunteerSchedule.readingScriptureA, subtitle: volunteerSchedule.lessonScriptureA },
    { label: "Presenting Lesson [A]", value: volunteerSchedule.presentingLessonA, subtitle: volunteerSchedule.lessonTitleA },
    { label: "Reading Scripture [B]", value: volunteerSchedule.readingScriptureB, subtitle: volunteerSchedule.lessonScriptureB },
    { label: "Presenting Lesson [B]", value: volunteerSchedule.presentingLessonB, subtitle: volunteerSchedule.lessonTitleB },
    { label: "Closing Prayer", value: volunteerSchedule.closingPrayer },
  ].filter(r => r.value) : []

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Ambient rose glow orbs */}


      {!volunteerSchedule ? (
        <div className="relative w-full max-w-3xl lu-panel p-12 flex flex-col items-center justify-center">
          <Users className="h-32 w-32 text-white/30 mb-8 relative" />
          <h2 className="text-5xl font-semibold text-white/60 relative">No Volunteer Schedule</h2>
        </div>
      ) : (
        <div className="relative w-full max-w-7xl flex flex-col items-center">
          {/* Header panel  -  bigger time-slot title and tagline so it reads
              clearly from the back of the room. */}
          <div className="relative w-full overflow-hidden lu-panel p-10 mb-6 text-center">
            <div className="relative flex items-center justify-center gap-5 mb-3">
              <div className="rounded-2xl lu-pin-coral-surface p-4 border lu-pin-coral-border">
                <Users className="h-10 w-10 lu-pin-coral-text" />
              </div>
              <h2 className="text-6xl font-bold">{volunteerTimeSlot}</h2>
            </div>
            <p className="text-2xl lu-pin-coral-text opacity-80 uppercase tracking-[0.12em] font-semibold">Devotional Assignments</p>
          </div>

          {/* Roles grid  -  every role card scaled up so the assignee name is
              the dominant element. Labels are still de-emphasized but now
              large enough to be legible across the room. */}
          <div className="relative w-full overflow-hidden lu-panel p-8">
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-5">
              {roles.map((role, index) => (
                <div
                  key={index}
                  className="p-6 lu-panel-inner"
                >
                  <p className="lu-pin-coral-text opacity-80 text-lg uppercase tracking-[0.12em] font-semibold mb-3">{role.label}</p>
                  <p className="text-4xl font-semibold leading-tight text-balance">{role.value}</p>
                  {role.subtitle && (
                    <p className="text-white/55 text-xl italic mt-2 text-balance">({role.subtitle})</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Announcements View - Only shows when there are announcements
function AnnouncementsView({ announcements }: { announcements: Announcement[] }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Ambient amber glow orbs */}


      {announcements.length === 0 ? (
        <div className="relative w-full max-w-2xl lu-panel p-12 flex flex-col items-center justify-center">
<Megaphone className="h-24 w-24 lu-text-meal opacity-60 mb-6 relative" />
          <h2 className="text-4xl font-bold lu-text-meal opacity-80 relative">No Announcements</h2>
        </div>
      ) : (
        <div className="relative w-full max-w-7xl flex flex-col items-center">
          {/* Header panel */}
          <div className="relative w-full overflow-hidden lu-panel p-7 mb-5 text-center">
            <div className="relative flex items-center justify-center gap-4">
              <div className="rounded-xl lu-announce-header p-3 border">
                <Megaphone className="h-7 w-7 lu-text-meal" />
              </div>
              <h2 className="text-4xl font-bold lu-text-meal">Announcements</h2>
            </div>
          </div>

          {/* Announcements list */}
          <div className="w-full space-y-4">
            {announcements.map((announcement) => {
              const isUrgent = announcement.priority === "urgent"
              const isHigh = announcement.priority === "high"
              const palette = isUrgent
                ? { border: "lu-priority-urgent-border", glow: "lu-priority-urgent-glow", icon: "lu-priority-urgent-text", badge: "URGENT" }
                : isHigh
                ? { border: "lu-priority-high-border", glow: "lu-priority-high-glow", icon: "lu-priority-high-text", badge: "IMPORTANT" }
                : { border: "border-white/10", glow: "lu-priority-normal-glow", icon: "lu-priority-normal-text", badge: null }

              return (
                <div
                  key={announcement.id}
                  className={`relative overflow-hidden lu-panel border ${palette.border} p-6`}
                >
{palette.badge && (
                    <div className="relative mb-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-[0.2em] ${palette.icon} bg-white/[0.05] border ${palette.border}`}>
                        {palette.badge}
                      </span>
                    </div>
                  )}
                  <h3 className="relative text-2xl font-bold mb-2 text-balance">{announcement.title}</h3>
                  <p className="relative text-lg text-white/70 whitespace-pre-wrap leading-relaxed">{announcement.message}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
