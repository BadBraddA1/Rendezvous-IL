"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Image from "next/image"
import { mapLocations, mapPaths } from "@/lib/venue-map-data"
import { 
  Cloud, 
  CloudRain, 
  Sun, 
  CloudSun, 
  Snowflake, 
  CloudLightning, 
  Wind, 
  Droplets,
  Calendar,
  Clock,
  ChevronRight,
  Megaphone,
  Coffee,
  Sandwich,
  Utensils,
  UtensilsCrossed,
  ClipboardCheck,
  Users,
  Target,
  Gamepad2,
  Mountain,
  Dumbbell,
  Flame,
  Camera,
  Trophy,
  Hand,
  Grid3x3,
  Dice5,
  Moon,
  Heart,
  MapPin,
  Sunrise,
  Sunset,
  Beef,
  Salad,
  CupSoda,
  Volleyball,
  CalendarDays,
  Bed
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

const SCHEDULE_ITEMS: ScheduleItem[] = [
  // Monday May 4
  { date: '2026-05-04', day: 'Monday', time: '1:00 PM - 5:15 PM', startHour: 13, startMinute: 0, endHour: 17, endMinute: 15, title: 'Check-in at Activity Center', location: 'Activity Center' },
  { date: '2026-05-04', day: 'Monday', time: '4:00 PM - 5:00 PM', startHour: 16, startMinute: 0, endHour: 17, endMinute: 0, title: 'Ice Breaker Game', location: 'AC Room 205/206' },
  { date: '2026-05-04', day: 'Monday', time: '5:30 PM', startHour: 17, startMinute: 30, title: 'Dinner', location: 'Lakeside Dining Room', isMeal: true },
  { date: '2026-05-04', day: 'Monday', time: '7:00 PM', startHour: 19, startMinute: 0, title: 'Evening Assembly & Introductions', location: 'AC Room 207' },
  { date: '2026-05-04', day: 'Monday', time: '8:00 PM', startHour: 20, startMinute: 0, title: 'Black-light Dodgeball & Games', location: 'Activity Center' },
  { date: '2026-05-04', day: 'Monday', time: '9:00 PM', startHour: 21, startMinute: 0, title: 'Nine Square & Knockout', location: 'Activity Center' },
  // Tuesday May 5
  { date: '2026-05-05', day: 'Tuesday', time: '7:30 AM', startHour: 7, startMinute: 30, title: 'Breakfast', location: 'Lakeside Dining Room', isMeal: true },
  { date: '2026-05-05', day: 'Tuesday', time: '9:00 AM', startHour: 9, startMinute: 0, title: 'Morning Assembly & Announcements', location: 'AC Room 207' },
  { date: '2026-05-05', day: 'Tuesday', time: '10:00 AM', startHour: 10, startMinute: 0, title: 'Young Adult & Mom\'s Session', location: 'Activity Center' },
  { date: '2026-05-05', day: 'Tuesday', time: '12:00 PM', startHour: 12, startMinute: 0, title: 'Lunch', location: 'Lakeside Dining Room', isMeal: true },
  { date: '2026-05-05', day: 'Tuesday', time: '1:30 PM', startHour: 13, startMinute: 30, title: 'Archery, Obstacle Course & Rope Games', location: 'Various' },
  { date: '2026-05-05', day: 'Tuesday', time: '5:30 PM', startHour: 17, startMinute: 30, title: 'Dinner', location: 'Lakeside Dining Room', isMeal: true },
  { date: '2026-05-05', day: 'Tuesday', time: '7:00 PM', startHour: 19, startMinute: 0, title: 'Evening Assembly & Announcements', location: 'AC Room 207' },
  { date: '2026-05-05', day: 'Tuesday', time: '8:00 PM', startHour: 20, startMinute: 0, title: 'Gym Time & Table Games', location: 'Activity Center' },
  // Wednesday May 6
  { date: '2026-05-06', day: 'Wednesday', time: '7:30 AM', startHour: 7, startMinute: 30, title: 'Breakfast', location: 'Lakeside Dining Room', isMeal: true },
  { date: '2026-05-06', day: 'Wednesday', time: '9:00 AM', startHour: 9, startMinute: 0, title: 'Morning Assembly & Group Picture', location: 'AC Room 207' },
  { date: '2026-05-06', day: 'Wednesday', time: '10:00 AM', startHour: 10, startMinute: 0, title: 'General / Family Session', location: 'Activity Center' },
  { date: '2026-05-06', day: 'Wednesday', time: '12:00 PM', startHour: 12, startMinute: 0, title: 'Lunch', location: 'Lakeside Dining Room', isMeal: true },
  { date: '2026-05-06', day: 'Wednesday', time: '1:30 PM', startHour: 13, startMinute: 30, title: 'Afternoon Activities', location: 'Various' },
  { date: '2026-05-06', day: 'Wednesday', time: '5:30 PM', startHour: 17, startMinute: 30, title: 'Dinner', location: 'Lakeside Dining Room', isMeal: true },
  { date: '2026-05-06', day: 'Wednesday', time: '7:00 PM', startHour: 19, startMinute: 0, title: 'Evening Assembly & Announcements', location: 'AC Room 207' },
  { date: '2026-05-06', day: 'Wednesday', time: '8:00 PM', startHour: 20, startMinute: 0, title: 'Game Night & Bonfire', location: 'Activity Center' },
  // Thursday May 7
  { date: '2026-05-07', day: 'Thursday', time: '7:30 AM', startHour: 7, startMinute: 30, title: 'Breakfast', location: 'Lakeside Dining Room', isMeal: true },
  { date: '2026-05-07', day: 'Thursday', time: '9:00 AM', startHour: 9, startMinute: 0, title: 'Morning Assembly & Announcements', location: 'AC Room 207' },
  { date: '2026-05-07', day: 'Thursday', time: '10:00 AM', startHour: 10, startMinute: 0, title: 'Session Time', location: 'Activity Center' },
  { date: '2026-05-07', day: 'Thursday', time: '12:00 PM', startHour: 12, startMinute: 0, title: 'Lunch', location: 'Lakeside Dining Room', isMeal: true },
  { date: '2026-05-07', day: 'Thursday', time: '1:30 PM', startHour: 13, startMinute: 30, title: 'Afternoon Activities', location: 'Various' },
  { date: '2026-05-07', day: 'Thursday', time: '5:30 PM', startHour: 17, startMinute: 30, title: 'Dinner & Awards Ceremony', location: 'Lakeside Dining Room', isMeal: true },
  { date: '2026-05-07', day: 'Thursday', time: '7:00 PM', startHour: 19, startMinute: 0, title: 'Evening Assembly', location: 'AC Room 207' },
  { date: '2026-05-07', day: 'Thursday', time: '8:00 PM', startHour: 20, startMinute: 0, title: 'Evening Activities', location: 'Activity Center' },
  // Friday May 8
  { date: '2026-05-08', day: 'Friday', time: '7:30 AM', startHour: 7, startMinute: 30, title: 'Breakfast', location: 'Lakeside Dining Room', isMeal: true },
  { date: '2026-05-08', day: 'Friday', time: '9:00 AM', startHour: 9, startMinute: 0, title: 'Final Assembly & Farewell', location: 'AC Room 207' },
  { date: '2026-05-08', day: 'Friday', time: '11:00 AM', startHour: 11, startMinute: 0, title: 'Event Concludes / Checkout', location: 'Various' },
]

type ViewType = "all" | "weather" | "schedule" | "meal" | "volunteers" | "announcements" | "map"

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

function getEventIcon(title: string, isMeal?: boolean, size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" = "md") {
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
  
  if (isMeal) {
    if (lowerTitle.includes('breakfast')) return <Coffee className={`${base} text-amber-500`} />
    if (lowerTitle.includes('lunch')) return <Sandwich className={`${base} text-yellow-500`} />
    if (lowerTitle.includes('dinner')) return <UtensilsCrossed className={`${base} text-orange-500`} />
    return <Utensils className={`${base} text-orange-400`} />
  }
  
  if (lowerTitle.includes('check-in') || lowerTitle.includes('checkout')) return <ClipboardCheck className={`${base} text-emerald-400`} />
  if (lowerTitle.includes('assembly') || lowerTitle.includes('announcement')) return <Megaphone className={`${base} text-rose-400`} />
  if (lowerTitle.includes('archery')) return <Target className={`${base} text-red-500`} />
  if (lowerTitle.includes('dodgeball')) return <Volleyball className={`${base} text-violet-400`} />
  if (lowerTitle.includes('game') || lowerTitle.includes('knockout')) return <Gamepad2 className={`${base} text-fuchsia-400`} />
  if (lowerTitle.includes('obstacle') || lowerTitle.includes('rope')) return <Mountain className={`${base} text-stone-400`} />
  if (lowerTitle.includes('gym') || lowerTitle.includes('sport')) return <Dumbbell className={`${base} text-sky-400`} />
  if (lowerTitle.includes('bonfire') || lowerTitle.includes('fire')) return <Flame className={`${base} text-orange-500`} />
  if (lowerTitle.includes('picture') || lowerTitle.includes('photo')) return <Camera className={`${base} text-pink-400`} />
  if (lowerTitle.includes('award') || lowerTitle.includes('ceremony')) return <Trophy className={`${base} text-yellow-400`} />
  if (lowerTitle.includes('farewell') || lowerTitle.includes('goodbye')) return <Hand className={`${base} text-amber-400`} />
  if (lowerTitle.includes('ice breaker') || lowerTitle.includes('introduction')) return <Users className={`${base} text-cyan-400`} />
  if (lowerTitle.includes('nine square')) return <Grid3x3 className={`${base} text-lime-400`} />
  if (lowerTitle.includes('table game')) return <Dice5 className={`${base} text-purple-400`} />
  if (lowerTitle.includes('mom') || lowerTitle.includes('family')) return <Heart className={`${base} text-rose-500`} />
  if (lowerTitle.includes('young adult') || lowerTitle.includes('session') || lowerTitle.includes('meeting')) return <Users className={`${base} text-cyan-400`} />
  if (lowerTitle.includes('afternoon') || lowerTitle.includes('activities')) return <Sun className={`${base} text-yellow-400`} />
  if (lowerTitle.includes('evening')) return <Moon className={`${base} text-indigo-300`} />
  
  return <MapPin className={`${base} text-orange-400`} />
}

function getGreetingIcon(hour: number, sizeClass: string = "h-20 w-20") {
  if (hour >= 5 && hour < 12) return <Sunrise className={`${sizeClass} text-yellow-400 shrink-0`} />
  if (hour >= 12 && hour < 17) return <Sun className={`${sizeClass} text-yellow-400 shrink-0`} />
  if (hour >= 17 && hour < 21) return <Sunset className={`${sizeClass} text-orange-400 shrink-0`} />
  return <Moon className={`${sizeClass} text-blue-300 shrink-0`} />
}

// TEST MODE: Set to true to simulate the event
// Set to just before the first event starts (May 4, 2026 at 12:55 PM - 5 min before Check-in)
const TEST_MODE = true
const TEST_DATE = new Date('2026-05-04T12:55:00')

function getCentralTime(): Date {
  if (TEST_MODE) {
    return TEST_DATE
  }
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
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
    return <CloudLightning className={`${iconClass} text-yellow-500`} />
  } else if (weatherId >= 300 && weatherId < 600) {
    return <CloudRain className={`${iconClass} text-blue-400`} />
  } else if (weatherId >= 600 && weatherId < 700) {
    return <Snowflake className={`${iconClass} text-blue-200`} />
  } else if (weatherId >= 700 && weatherId < 800) {
    return <Wind className={`${iconClass} text-gray-400`} />
  } else if (weatherId === 800) {
    return isDay ? <Sun className={`${iconClass} text-yellow-400`} /> : <Sun className={`${iconClass} text-gray-300`} />
  } else if (weatherId > 800) {
    return isDay ? <CloudSun className={`${iconClass} text-gray-400`} /> : <Cloud className={`${iconClass} text-gray-400`} />
  }
  return <Cloud className={`${iconClass} text-gray-400`} />
}

export default function LiveUpdatesPage() {
  const [currentView, setCurrentView] = useState<ViewType>("all")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isAutoRotating, setIsAutoRotating] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  
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
  const availableViews = useMemo<ViewType[]>(() => {
    const views: ViewType[] = ["all", "weather", "schedule", "meal", "map"]
    if (hasVolunteerData) {
      views.push("volunteers")
    }
    if (announcements.length > 0) {
      views.push("announcements")
    }
    return views
  }, [hasVolunteerData, announcements.length])

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

  // Fetch meal data based on next meal
  useEffect(() => {
    const fetchMealData = async () => {
      if (!nextMeal) {
        setMealData(null)
        return
      }
      
      try {
        const centralNow = getCentralTime()
        const year = centralNow.getFullYear()
        const month = String(centralNow.getMonth() + 1).padStart(2, '0')
        const day = String(centralNow.getDate()).padStart(2, '0')
        const centralDateStr = `${year}-${month}-${day}`
        
        // Determine meal type from title
        const title = nextMeal.title.toLowerCase()
        let mealType = 'dinner'
        if (title.includes('breakfast')) mealType = 'breakfast'
        else if (title.includes('lunch')) mealType = 'lunch'
        
        const res = await fetch(`/api/meals?date=${centralDateStr}&mealType=${mealType}`)
        const data = await res.json()
        if (data.meals && data.meals.length > 0) {
          setMealData(data.meals[0])
        } else {
          setMealData(null)
        }
      } catch {
        setMealData(null)
      }
    }
    fetchMealData()
  }, [nextMeal])

  // Fetch volunteer schedule
  useEffect(() => {
    const fetchVolunteerSchedule = async () => {
      try {
        const centralNow = getCentralTime()
        const centralHour = centralNow.getHours()
        // Format date as YYYY-MM-DD
        const year = centralNow.getFullYear()
        const month = String(centralNow.getMonth() + 1).padStart(2, '0')
        const day = String(centralNow.getDate()).padStart(2, '0')
        const centralDateStr = `${year}-${month}-${day}`
        
        // Morning Devotion: before noon, Evening Devotion: after noon
        const timeSlot = centralHour < 12 ? "Morning Devotion" : "Evening Devotion"
        setVolunteerTimeSlot(timeSlot)
        
        const res = await fetch(`/api/volunteer-schedule?date=${centralDateStr}&timeSlot=${encodeURIComponent(timeSlot)}`)
        const data = await res.json()
        if (data.schedule) {
          setVolunteerSchedule(data.schedule)
        }
      } catch {}
    }
    fetchVolunteerSchedule()
    const interval = setInterval(fetchVolunteerSchedule, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Update current time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
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
    }, 10000)

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
        case "0":
        case "a":
        case "A":
          setIsAutoRotating(prev => !prev)
          break
        case "f":
        case "F":
          toggleFullscreen()
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

  // Format current date/time
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago',
  }).replace(' ', '  ')
  
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago',
  })

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-12 py-6 border-b border-white/10">
        <div className="flex items-center gap-5">
          <div className="relative h-16 w-16 shrink-0 rounded-xl bg-white/5 border border-white/10 p-2 flex items-center justify-center">
            <Image
              src="/rendezvous-logo.png"
              alt="Rendezvous Homeschool Family Retreat"
              width={56}
              height={56}
              className="object-contain brightness-0 invert"
              priority
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold tracking-wide leading-tight">RENDEZVOUS 2026</h1>
            <span className="text-white/60 text-base tracking-widest uppercase">Live Updates</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-5xl font-light tracking-wider tabular-nums">{formattedTime}</div>
          <div className="text-white/60 text-xl">{formattedDate}</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-12 flex items-center justify-center">
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
      </main>

      {/* Keyboard Controls Footer - hidden in fullscreen */}
      {!isFullscreen && (
      <footer className="px-12 py-6 border-t border-white/10">
        <div className="flex items-center gap-6 justify-center flex-wrap">
          <span className="text-white/50 text-lg">Keyboard Controls:</span>
          <KeyButton label="1 All" active={currentView === "all"} />
          <KeyButton label="2 Weather" active={currentView === "weather"} />
          <KeyButton label="3 Schedule" active={currentView === "schedule"} />
          <KeyButton label="4 Meal" active={currentView === "meal"} />
          <KeyButton label="5 Map" active={currentView === "map"} />
          {hasVolunteerData && (
            <KeyButton label="6 Volunteers" active={currentView === "volunteers"} />
          )}
          {announcements.length > 0 && (
            <KeyButton label="7 Announcements" active={currentView === "announcements"} />
          )}
          <KeyButton label="0/A Auto" active={isAutoRotating} />
          <KeyButton label="F Fullscreen" active={isFullscreen} />
          {isAutoRotating && (
            <span className="text-green-400 text-sm flex items-center gap-2 ml-4">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Auto-rotating
            </span>
          )}
        </div>
      </footer>
      )}
    </div>
  )
}

function KeyButton({ label, active }: { label: string; active?: boolean }) {
  return (
    <span className={`px-5 py-2.5 rounded-lg text-lg font-medium transition-colors ${
      active 
        ? "bg-orange-600 text-white" 
        : "bg-white/10 text-white/80 hover:bg-white/20"
    }`}>
      {label}
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
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/[0.08] via-white/[0.03] to-transparent backdrop-blur-sm p-7">
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-violet-500/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-xl bg-violet-500/15 p-2.5 border border-violet-400/20">
            <Calendar className="h-5 w-5 text-violet-300" />
          </div>
          <span className="text-sm uppercase tracking-[0.2em] font-bold text-violet-300/90">Schedule</span>
        </div>
        <div className="space-y-2.5">
          {eventsToShow.length > 0 ? (
            eventsToShow.map(({ item, isNow }, index) => (
              <div 
                key={index}
                className={`p-3.5 rounded-xl border transition-colors ${
                  isNow 
                    ? "bg-green-500/10 border-green-400/30" 
                    : item === nextItem
                    ? "bg-white/[0.07] border-white/15"
                    : "bg-white/[0.03] border-white/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    {isNow && (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400" />
                      </span>
                    )}
                    {getEventIcon(item.title, item.isMeal, "xs")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base leading-tight truncate">{item.title}</p>
                    <p className={`text-sm mt-0.5 ${isNow ? "text-green-300 font-bold uppercase tracking-wider" : "text-white/50"}`}>
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
    <div className="relative w-full max-w-[1800px] mx-auto">
      {/* Ambient background orbs for depth */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-orange-500/10 blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
        <div className="absolute top-1/3 -right-40 h-[32rem] w-[32rem] rounded-full bg-amber-500/10 blur-3xl animate-pulse" style={{ animationDuration: "8s", animationDelay: "2s" }} />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-rose-500/8 blur-3xl animate-pulse" style={{ animationDuration: "7s", animationDelay: "4s" }} />
      </div>

      {/* HERO BANNER - Logo, tagline, featured event */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent backdrop-blur-sm">
        {/* Decorative gradient stripe */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/60 to-transparent" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-[40rem] rounded-full bg-orange-500/20 blur-3xl" />

        <div className="relative grid grid-cols-12 gap-8 p-10">
          {/* Left: Logo + Tagline */}
          <div className="col-span-5 flex flex-col items-center justify-center text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 -z-10 rounded-full bg-orange-500/30 blur-3xl" />
              <Image
                src="/rendezvous-logo.png"
                alt="Rendezvous Homeschool Family Retreat"
                width={400}
                height={400}
                className="h-44 w-auto drop-shadow-2xl brightness-0 invert"
                priority
              />
            </div>
            <div className="inline-flex items-center gap-3">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-orange-400/60" />
              <span className="text-xs font-bold uppercase tracking-[0.4em] text-orange-400">2026</span>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-orange-400/60" />
            </div>
          </div>

          {/* Right: Featured event spotlight */}
          <div className="col-span-7 flex flex-col justify-center">
            {featuredItem ? (
              <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/10 via-white/[0.03] to-transparent p-8">
                <div className="flex items-center gap-3 mb-6">
                  {featuredIsNow ? (
                    <>
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-green-400" />
                      </span>
                      <span className="text-sm font-bold uppercase tracking-[0.3em] text-green-400">Happening Now</span>
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-5 w-5 text-orange-400" />
                      <span className="text-sm font-bold uppercase tracking-[0.3em] text-orange-400">Up Next</span>
                    </>
                  )}
                </div>
                <div className="flex items-start gap-6">
                  <div className="shrink-0 rounded-2xl bg-white/5 border border-white/10 p-4">
                    {getEventIcon(featuredItem.title, featuredItem.isMeal, "lg")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-4xl font-bold leading-tight mb-3 text-balance">{featuredItem.title}</h2>
                    <div className="flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-base">
                        <Clock className="h-4 w-4 text-orange-400" />
                        {featuredIsNow ? featuredItem.time : `${featuredItem.day} ${featuredItem.time}`}
                      </span>
                      {featuredItem.location && (
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-base">
                          <MapPin className="h-4 w-4 text-orange-400" />
                          {featuredItem.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
                <Bed className="h-16 w-16 text-white/30 mx-auto mb-4" />
                <p className="text-2xl font-semibold text-white/60">Free Time</p>
                <p className="text-base text-white/40 mt-2">Enjoy the retreat!</p>
              </div>
            )}
          </div>
        </div>

        {/* Decorative bottom stripe */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-400/30 to-transparent" />
      </div>

      {/* CARDS GRID */}
      <div className={`grid grid-cols-1 gap-6 ${hasVolunteers ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {/* Weather Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/[0.08] via-white/[0.03] to-transparent backdrop-blur-sm p-7">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-sky-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-sky-500/15 p-2.5 border border-sky-400/20">
                <Droplets className="h-5 w-5 text-sky-300" />
              </div>
              <span className="text-sm uppercase tracking-[0.2em] font-bold text-sky-300/90">Weather</span>
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
                        <p className="text-xs text-sky-300 flex items-center justify-center gap-1 mt-0.5">
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
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/[0.08] via-white/[0.03] to-transparent backdrop-blur-sm p-7">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-amber-500/15 p-2.5 border border-amber-400/20">
                <UtensilsCrossed className="h-5 w-5 text-amber-300" />
              </div>
              <span className="text-sm uppercase tracking-[0.2em] font-bold text-amber-300/90">Next Meal</span>
            </div>
            {nextMeal ? (
              <div className="flex flex-col items-center justify-center text-center pt-2">
                <div className="mb-4 rounded-2xl bg-white/5 border border-white/10 p-4">
                  {getEventIcon(nextMeal.title, true, "lg")}
                </div>
                <h3 className="text-2xl font-bold mb-3">{nextMeal.title}</h3>
                <p className="text-white/70 text-lg flex items-center justify-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-amber-300" />
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
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-rose-500/[0.08] via-white/[0.03] to-transparent backdrop-blur-sm p-7">
            <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-rose-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-xl bg-rose-500/15 p-2.5 border border-rose-400/20">
                  <Users className="h-5 w-5 text-rose-300" />
                </div>
                <span className="text-sm uppercase tracking-[0.2em] font-bold text-rose-300/90 truncate">{volunteerTimeSlot}</span>
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
function WeatherView({ weather }: { weather: WeatherData | null }) {
  // Get time-based greeting
  const centralNow = getCentralTime()
  const hour = centralNow.getHours()
  let greeting = "Welcome to Rendezvous!"
  
  if (hour >= 5 && hour < 12) {
    greeting = "Good Morning!"
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good Afternoon!"
  } else if (hour >= 17 && hour < 21) {
    greeting = "Good Evening!"
  } else {
    greeting = "Good Night!"
  }

  if (!weather) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="flex items-center gap-5 mb-4">
          {getGreetingIcon(hour, "h-16 w-16")}
          <p className="text-6xl font-light">{greeting}</p>
        </div>
        <p className="text-3xl text-white/70 mb-8">Welcome to Rendezvous 2026</p>
        <p className="text-white/50 text-2xl">Loading weather...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* Greeting */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-5 mb-3">
          {getGreetingIcon(hour, "h-16 w-16")}
          <p className="text-6xl font-light">{greeting}</p>
        </div>
        <p className="text-2xl text-white/60">Welcome to Rendezvous 2026</p>
      </div>
      
      <div className="flex items-center gap-10 mb-6">
        {getWeatherIcon(weather.current.weather[0].id, weather.current.weather[0].icon, "lg")}
        <span className="text-[12rem] font-light leading-none">{Math.round(weather.current.temp)}°</span>
      </div>
      <p className="text-4xl text-white/80 capitalize mb-10">{weather.current.weather[0].description}</p>
      
      <div className="flex items-center gap-16 text-2xl text-white/60 mb-14">
        <span className="flex items-center gap-3">
          <Droplets className="h-7 w-7" />
          {weather.current.humidity}% Humidity
        </span>
        <span className="flex items-center gap-3">
          <Wind className="h-7 w-7" />
          {Math.round(weather.current.wind_speed)} mph Wind
        </span>
      </div>

      <div className="flex gap-6">
        {weather.hourly.slice(0, 6).map((hour) => (
          <div key={hour.dt} className="text-center p-6 rounded-2xl bg-white/5 min-w-[120px]">
            <p className="text-lg text-white/50 mb-3">{formatTime(hour.dt)}</p>
            <div className="flex justify-center mb-3">
              {getWeatherIcon(hour.weather[0].id, hour.weather[0].icon, "sm")}
            </div>
            <p className="text-3xl font-semibold mb-2">{Math.round(hour.temp)}°</p>
            {hour.pop > 0.1 && (
              <p className="text-base text-blue-400 flex items-center justify-center gap-2">
                <Droplets className="h-4 w-4" />
                {Math.round(hour.pop * 100)}%
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Schedule View - Full screen schedule with all upcoming events
function ScheduleView({ 
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
  // Use upcoming events - today if available, else all upcoming
  const upcoming = upcomingToday.length > 0 ? upcomingToday : upcomingAll.slice(0, 10)
  const showingFuture = upcomingToday.length === 0 && upcomingAll.length > 0

  return (
    <div className="flex h-full gap-16">
      {/* Left side - Happening Now / Up Next */}
      <div className="flex-1 flex flex-col justify-center">
        {nowItem && (
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 text-white/50 text-xl mb-6">
              <span className="w-4 h-4 bg-green-400 rounded-full animate-pulse" />
              <span>HAPPENING NOW</span>
            </div>
            <div className="flex justify-center mb-6">{getEventIcon(nowItem.title, nowItem.isMeal, "2xl")}</div>
            <h2 className="text-5xl font-bold mb-4">{nowItem.title}</h2>
            <p className="text-3xl text-white/60 mb-3">{nowItem.time}</p>
            {nowItem.location && (
              <p className="text-2xl text-white/40 flex items-center justify-center gap-2">
                <MapPin className="h-6 w-6" />
                {nowItem.location}
              </p>
            )}
          </div>
        )}
        
        {nextItem && (
          <div className="text-center">
            {nowItem && <div className="w-32 h-px bg-white/20 mx-auto mb-12" />}
            <div className="flex items-center justify-center gap-3 text-white/50 text-xl mb-6">
              <ChevronRight className="h-6 w-6" />
              <span>UP NEXT</span>
            </div>
            <div className="flex justify-center mb-6">{getEventIcon(nextItem.title, nextItem.isMeal, nowItem ? "lg" : "2xl")}</div>
            <h2 className={`font-bold mb-4 ${nowItem ? "text-3xl" : "text-5xl"}`}>{nextItem.title}</h2>
            <p className={`text-white/60 mb-3 ${nowItem ? "text-xl" : "text-3xl"}`}>{nextItem.day} {nextItem.time}</p>
            {nextItem.location && (
              <p className={`text-white/40 flex items-center justify-center gap-2 ${nowItem ? "text-lg" : "text-2xl"}`}>
                <MapPin className={nowItem ? "h-4 w-4" : "h-6 w-6"} />
                {nextItem.location}
              </p>
            )}
          </div>
        )}
        
        {!nowItem && !nextItem && (
          <div className="text-center">
            <Bed className="h-32 w-32 text-white/30 mx-auto mb-6" />
            <h2 className="text-5xl font-bold text-white/60">No Scheduled Events</h2>
            <p className="text-2xl text-white/40 mt-4">Enjoy your free time!</p>
          </div>
        )}
      </div>

      {/* Right side - Upcoming Schedule */}
      {upcoming.length > 0 && (
        <div className="w-[450px] flex flex-col">
          <h3 className="text-xl font-semibold text-white/60 mb-6 flex items-center gap-3 uppercase tracking-wider">
            <CalendarDays className="h-6 w-6 text-orange-400" />
            {showingFuture ? "Upcoming Schedule" : "Today's Schedule"}
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {upcoming.map((item, index) => (
              <div 
                key={index}
                className={`p-5 rounded-xl border transition-colors ${
                  item === nextItem 
                    ? "bg-white/10 border-white/30" 
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div className="flex items-center gap-4">
                  {getEventIcon(item.title, item.isMeal, "sm")}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-lg">{item.title}</p>
                    <p className="text-base text-white/50">
                      {showingFuture ? `${item.day} ${item.time}` : item.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Meal View - Full screen meal display with menu
function MealView({ nextMeal, mealData }: { nextMeal: ScheduleItem | null; mealData: MealData | null }) {
  if (!nextMeal) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <UtensilsCrossed className="h-32 w-32 text-white/30 mb-8" />
        <h2 className="text-5xl font-bold text-white/60">No Upcoming Meals</h2>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="mb-8">
        {getEventIcon(nextMeal.title, true, "2xl")}
      </div>
      <h2 className="text-6xl font-bold mb-4">{nextMeal.title}</h2>
      <p className="text-3xl text-white/60 mb-3">{nextMeal.time}</p>
      {nextMeal.location && (
        <p className="text-xl text-white/40 mb-10 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {nextMeal.location}
        </p>
      )}
      
      {/* Menu Display */}
      {mealData ? (
        <div className="mt-4 p-10 rounded-2xl bg-white/5 border border-white/10 max-w-3xl w-full">
          <h3 className="text-3xl font-semibold mb-8 text-center border-b border-white/10 pb-6">Menu</h3>
          <div className="space-y-6">
            <div className="flex items-start gap-5">
              <Beef className="h-9 w-9 text-red-400 shrink-0" />
              <div>
                <p className="text-white/50 text-base uppercase tracking-wider">Main Dish</p>
                <p className="text-2xl font-medium">{mealData.main_dish}</p>
              </div>
            </div>
            
            {mealData.sides && mealData.sides.length > 0 && (
              <div className="flex items-start gap-5">
                <Salad className="h-9 w-9 text-green-400 shrink-0" />
                <div>
                  <p className="text-white/50 text-base uppercase tracking-wider">Sides</p>
                  <p className="text-xl">{mealData.sides.join(", ")}</p>
                </div>
              </div>
            )}
            
            {mealData.drinks && mealData.drinks.length > 0 && (
              <div className="flex items-start gap-5">
                <CupSoda className="h-9 w-9 text-cyan-400 shrink-0" />
                <div>
                  <p className="text-white/50 text-base uppercase tracking-wider">Beverages</p>
                  <p className="text-xl">{mealData.drinks.join(", ")}</p>
                </div>
              </div>
            )}
            
            {mealData.notes && (
              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <p className="text-white/60 italic text-lg">{mealData.notes}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-10 text-white/40 text-xl">
          Menu details coming soon...
        </div>
      )}
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

  const colorToHex: Record<string, string> = {
    red: "#ef4444",
    orange: "#f97316",
    yellow: "#eab308",
    green: "#22c55e",
    blue: "#3b82f6",
    purple: "#a855f7",
    pink: "#ec4899",
  }

  if (featuredLocation) {
    const c = featuredLocation.color || (
      featuredLocation.category === "dining" ? "orange"
      : featuredLocation.category === "meeting" ? "red"
      : featuredLocation.category === "lodging" ? "blue"
      : "purple"
    )
    routeColor = colorToHex[c] || routeColor
  }

  return (
    <div className="w-full h-full flex gap-8">
      {/* Left side - Event info */}
      <div className="w-[420px] flex flex-col justify-center shrink-0">
        {featuredItem ? (
          <>
            <div className="flex items-center gap-3 text-white/50 text-xl mb-6 uppercase tracking-wider">
              {isHappeningNow ? (
                <>
                  <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  <span>Happening Now</span>
                </>
              ) : (
                <>
                  <ChevronRight className="h-5 w-5" />
                  <span>Up Next</span>
                </>
              )}
            </div>
            <div className="mb-6">
              {getEventIcon(featuredItem.title, featuredItem.isMeal, "xl")}
            </div>
            <h2 className="text-4xl font-bold mb-3 leading-tight">{featuredItem.title}</h2>
            <p className="text-2xl text-white/70 mb-2">
              {isHappeningNow ? featuredItem.time : `${featuredItem.day} ${featuredItem.time}`}
            </p>
            {prevLocation && routePoints && (
              <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-3 h-3 rounded-full bg-white/40" />
                    <div className="w-px h-6 bg-white/20 my-1" />
                    <ChevronRight className="h-4 w-4 text-white/40 rotate-90" />
                  </div>
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-0.5">Coming From</p>
                    <p className="text-lg font-medium text-white/80 leading-tight">{prevLocation.name}</p>
                  </div>
                </div>
              </div>
            )}
            {featuredLocation && (
              <div className={`${prevLocation && routePoints ? "mt-3" : "mt-6"} p-5 rounded-xl bg-orange-500/10 border border-orange-500/30`}>
                <div className="flex items-start gap-3">
                  <MapPin className="h-7 w-7 text-orange-400 shrink-0 mt-1" fill="currentColor" />
                  <div>
                    <p className="text-orange-400 text-xs uppercase tracking-wider mb-1">
                      {prevLocation && routePoints ? "Heading To" : "Location"}
                    </p>
                    <p className="text-2xl font-semibold leading-tight">{featuredLocation.name}</p>
                    {featuredLocation.description && (
                      <p className="text-white/60 text-base mt-2 leading-snug">{featuredLocation.description}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <Bed className="h-32 w-32 text-white/30 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-white/60">No Active Events</h2>
            <p className="text-xl text-white/40 mt-3">Free time at the venue</p>
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <MapPin className="h-4 w-4 text-red-500" fill="currentColor" />
            <span>Meeting</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <MapPin className="h-4 w-4 text-orange-500" fill="currentColor" />
            <span>Dining</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <MapPin className="h-4 w-4 text-purple-500" fill="currentColor" />
            <span>Activity</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <MapPin className="h-4 w-4 text-blue-500" fill="currentColor" />
            <span>Lodging</span>
          </div>
        </div>
      </div>

      {/* Right side - Venue map */}
      <div className="flex-1 relative rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center p-3 pt-14 min-h-0">
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
            const color = location.color || (
              location.category === "dining" ? "orange"
              : location.category === "meeting" ? "red"
              : location.category === "lodging" ? "blue"
              : "purple"
            )
            const hex = colorToHex[color] || "#a855f7"
            
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
                  <>
                    {/* Pulsing ring */}
                    <div 
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full animate-ping"
                      style={{ backgroundColor: hex, opacity: 0.4 }}
                    />
                    {/* Solid ring */}
                    <div 
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full"
                      style={{ backgroundColor: hex, opacity: 0.3 }}
                    />
                  </>
                )}
                {isPrev && (
                  <div 
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-2 border-white/70 bg-white/30"
                  />
                )}
                <MapPin
                  className={`relative drop-shadow-lg transition-all ${
                    isFeatured ? "h-14 w-14 animate-bounce" 
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
  if (!volunteerSchedule) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-5xl font-bold text-white/60">No Volunteer Schedule</h2>
      </div>
    )
  }

  const roles = [
    { label: "Opening Prayer", value: volunteerSchedule.openingPrayer },
    { label: "Leading Singing [A]", value: volunteerSchedule.leadingSingingA },
    { label: "Leading Singing [B]", value: volunteerSchedule.leadingSingingB },
    { label: "Reading Scripture [A]", value: volunteerSchedule.readingScriptureA, subtitle: volunteerSchedule.lessonScriptureA },
    { label: "Presenting Lesson [A]", value: volunteerSchedule.presentingLessonA, subtitle: volunteerSchedule.lessonTitleA },
    { label: "Reading Scripture [B]", value: volunteerSchedule.readingScriptureB, subtitle: volunteerSchedule.lessonScriptureB },
    { label: "Presenting Lesson [B]", value: volunteerSchedule.presentingLessonB, subtitle: volunteerSchedule.lessonTitleB },
    { label: "Closing Prayer", value: volunteerSchedule.closingPrayer },
  ].filter(r => r.value)

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-5xl font-bold mb-3">{volunteerTimeSlot}</h2>
        <p className="text-2xl text-white/60">Devotional Assignments</p>
      </div>
      
      <div className="w-full bg-white/5 rounded-2xl border border-white/10 p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {roles.map((role, index) => (
            <div key={index} className="flex items-start">
              <div>
                <p className="text-white/50 text-base uppercase tracking-wider">{role.label}</p>
                <p className="text-2xl font-medium">{role.value}</p>
                {role.subtitle && (
                  <p className="text-white/40 text-base italic">({role.subtitle})</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Announcements View - Only shows when there are announcements
function AnnouncementsView({ announcements }: { announcements: Announcement[] }) {
  if (announcements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Megaphone className="h-32 w-32 text-amber-400 mb-10" />
        <h2 className="text-5xl font-bold text-amber-400">No Announcements</h2>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-5xl mx-auto">
      <div className="flex items-center gap-6 mb-12">
        <Megaphone className="h-16 w-16 text-amber-400" />
        <h2 className="text-5xl font-bold text-amber-400">Announcements</h2>
      </div>
      
      <div className="w-full space-y-8">
        {announcements.map((announcement) => (
          <div 
            key={announcement.id} 
            className={`p-8 rounded-2xl border ${
              announcement.priority === "urgent" 
                ? "bg-red-500/10 border-red-500/50" 
                : announcement.priority === "high"
                ? "bg-orange-500/10 border-orange-500/50"
                : "bg-white/5 border-white/10"
            }`}
          >
            <h3 className="text-3xl font-bold mb-4">{announcement.title}</h3>
            <p className="text-xl text-white/70 whitespace-pre-wrap">{announcement.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
