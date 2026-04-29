"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
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
  Megaphone
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
  readingScriptureB: string | null
  presentingLessonB: string | null
  lessonTitleB: string | null
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

type ViewType = "all" | "weather" | "schedule" | "meal" | "volunteers" | "announcements"

function getEventEmoji(title: string, isMeal?: boolean): string {
  const lowerTitle = title.toLowerCase()
  
  if (isMeal) {
    if (lowerTitle.includes('breakfast')) return '🍳'
    if (lowerTitle.includes('lunch')) return '🥪'
    if (lowerTitle.includes('dinner')) return '🍽️'
    return '🍴'
  }
  
if (lowerTitle.includes('check-in') || lowerTitle.includes('checkout')) return '📝'
  if (lowerTitle.includes('assembly') || lowerTitle.includes('announcement')) return '📣'
  if (lowerTitle.includes('session') || lowerTitle.includes('meeting')) return '👥'
  if (lowerTitle.includes('dodgeball')) return '🏐'
  if (lowerTitle.includes('game') || lowerTitle.includes('knockout')) return '🎯'
  if (lowerTitle.includes('archery')) return '🎯'
  if (lowerTitle.includes('obstacle') || lowerTitle.includes('rope')) return '🧱'
  if (lowerTitle.includes('gym') || lowerTitle.includes('sport')) return '🏀'
  if (lowerTitle.includes('bonfire') || lowerTitle.includes('fire')) return '🔥'
  if (lowerTitle.includes('picture') || lowerTitle.includes('photo')) return '📷'
  if (lowerTitle.includes('award') || lowerTitle.includes('ceremony')) return '🏆'
  if (lowerTitle.includes('farewell') || lowerTitle.includes('goodbye')) return '👋'
  if (lowerTitle.includes('ice breaker') || lowerTitle.includes('introduction')) return '🤝'
  if (lowerTitle.includes('nine square')) return '🔲'
  if (lowerTitle.includes('table game')) return '🎲'
  if (lowerTitle.includes('afternoon') || lowerTitle.includes('activities')) return '☀️'
  if (lowerTitle.includes('evening')) return '🌙'
  if (lowerTitle.includes('mom') || lowerTitle.includes('family')) return '👨‍👩‍👧'
  if (lowerTitle.includes('young adult')) return '👥'
  
  return '📌'
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
    const views: ViewType[] = ["all", "weather", "schedule", "meal"]
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
      let meal: ScheduleItem | null = null

      const currentMinutes = centralHour * 60 + centralMinute

      // Find current and next items
      for (let i = 0; i < SCHEDULE_ITEMS.length; i++) {
        const item = SCHEDULE_ITEMS[i]
        
        if (item.date < centralDateStr) continue

        const itemStartMinutes = item.startHour * 60 + item.startMinute
        let itemEndMinutes: number
        if (item.endHour !== undefined && item.endMinute !== undefined) {
          itemEndMinutes = item.endHour * 60 + item.endMinute
        } else {
          itemEndMinutes = itemStartMinutes + 60
        }

        if (item.date === centralDateStr) {
          if (currentMinutes >= itemStartMinutes && currentMinutes < itemEndMinutes) {
            current = item
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
          if (hasVolunteerData) {
            setCurrentView("volunteers")
            setIsAutoRotating(false)
          }
          break
        case "6":
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
        <div className="flex items-center gap-6">
          <h1 className="text-3xl font-bold tracking-wide">RENDEZVOUS 2026</h1>
          <span className="text-white/50 text-2xl">|</span>
          <span className="text-white/70 text-2xl">Live Updates</span>
        </div>
        <div className="text-right">
          <div className="text-5xl font-light tracking-wider">{formattedTime}</div>
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
          {hasVolunteerData && (
            <KeyButton label="5 Volunteers" active={currentView === "volunteers"} />
          )}
          {announcements.length > 0 && (
            <KeyButton label="6 Announcements" active={currentView === "announcements"} />
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
    <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
      <div className="flex items-center gap-3 text-white/60 text-lg mb-6">
        <Calendar className="h-6 w-6" />
        <span className="uppercase tracking-wider font-medium">Schedule</span>
      </div>
      <div className="space-y-3">
        {eventsToShow.length > 0 ? (
          eventsToShow.map(({ item, isNow }, index) => (
            <div 
              key={index}
              className={`p-4 rounded-xl border ${
                isNow 
                  ? "bg-white/10 border-white/20" 
                  : item === nextItem
                  ? "bg-white/5 border-white/15"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-3 shrink-0 pt-0.5">
                  {isNow && <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />}
                  <span className="text-2xl">{getEventEmoji(item.title, item.isMeal)}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-lg leading-tight">{item.title}</p>
                  <p className="text-base text-white/50 mt-1">
                    {isNow ? "NOW" : `${item.day} ${item.time}`}
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
  { label: "Reading Scripture [A]", value: volunteerSchedule.readingScriptureA },
  { label: "Presenting [A]", value: volunteerSchedule.presentingLessonA, subtitle: volunteerSchedule.lessonTitleA },
  { label: "Reading Scripture [B]", value: volunteerSchedule.readingScriptureB },
  { label: "Presenting [B]", value: volunteerSchedule.presentingLessonB, subtitle: volunteerSchedule.lessonTitleB },
  { label: "Closing Prayer", value: volunteerSchedule.closingPrayer },
  ].filter(item => item.value) : []

  const hasVolunteers = volunteerItems.length > 0

  return (
    <div className={`grid grid-cols-1 gap-8 w-full max-w-7xl ${hasVolunteers ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {/* Weather Card */}
      <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
        <div className="flex items-center gap-3 text-white/60 text-lg mb-6">
          <Droplets className="h-6 w-6" />
          <span className="uppercase tracking-wider font-medium">Weather</span>
        </div>
        {weather ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {getWeatherIcon(weather.current.weather[0].id, weather.current.weather[0].icon, "md")}
              <span className="text-6xl font-bold">{Math.round(weather.current.temp)}°</span>
            </div>
            <p className="text-white/70 capitalize text-xl">{weather.current.weather[0].description}</p>
            <div className="grid grid-cols-3 gap-3">
              {weather.hourly.slice(0, 3).map((hour) => (
                <div key={hour.dt} className="text-center p-4 rounded-xl bg-white/5">
                  <p className="text-sm text-white/50">{formatTime(hour.dt)}</p>
                  <div className="flex justify-center my-2">
                    {getWeatherIcon(hour.weather[0].id, hour.weather[0].icon, "sm")}
                  </div>
                  <p className="font-semibold text-lg">{Math.round(hour.temp)}°</p>
                  {hour.pop > 0.1 && (
                    <p className="text-sm text-blue-400 flex items-center justify-center gap-1">
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

      {/* Schedule Card - shows up to 5 events */}
      <ScheduleCard nowItem={nowItem} nextItem={nextItem} upcomingToday={upcomingToday} upcomingAll={upcomingAll} />

      {/* Next Meal Card */}
      <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
        <div className="flex items-center gap-3 text-white/60 text-lg mb-6">
          <Clock className="h-6 w-6" />
          <span className="uppercase tracking-wider font-medium">Next Meal</span>
        </div>
        {nextMeal ? (
          <div className="flex flex-col items-center justify-center h-[calc(100%-3rem)] text-center">
            <div className="text-7xl mb-4">
              {getEventEmoji(nextMeal.title, true)}
            </div>
            <h3 className="text-3xl font-bold mb-2">{nextMeal.title}</h3>
            <p className="text-white/60 text-xl">⏰ {nextMeal.time}</p>
            {nextMeal.location && (
              <p className="text-white/40 text-base mt-2">📍 {nextMeal.location}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[calc(100%-3rem)] text-center">
            <div className="text-5xl mb-4">🍽️</div>
            <p className="text-white/50 text-lg">No upcoming meals</p>
          </div>
        )}
      </div>

      {/* Volunteer Schedule Card - only show if there are volunteers */}
      {hasVolunteers && (
        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
          <div className="text-white/60 text-lg mb-6">
            <span className="uppercase tracking-wider font-medium">{volunteerTimeSlot}</span>
          </div>
          <div className="space-y-3">
            {volunteerItems.map((item, index) => (
              <div key={index} className="text-base">
                <span className="text-white/50">{item.label}:</span>
                <span className="font-medium text-lg ml-2">{item.value}</span>
                {item.subtitle && (
                  <span className="text-white/40 italic text-sm ml-2">({item.subtitle})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Weather View - Full screen weather
function WeatherView({ weather }: { weather: WeatherData | null }) {
  // Get time-based greeting
  const centralNow = getCentralTime()
  const hour = centralNow.getHours()
  let greeting = "Welcome to Rendezvous!"
  let greetingEmoji = "👋"
  
  if (hour >= 5 && hour < 12) {
    greeting = "Good Morning!"
    greetingEmoji = "☀️"
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good Afternoon!"
    greetingEmoji = "🌤️"
  } else if (hour >= 17 && hour < 21) {
    greeting = "Good Evening!"
    greetingEmoji = "🌅"
  } else {
    greeting = "Good Night!"
    greetingEmoji = "🌙"
  }

  if (!weather) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-6xl mb-4">{greetingEmoji} {greeting}</p>
        <p className="text-3xl text-white/70 mb-8">Welcome to Rendezvous 2026</p>
        <p className="text-white/50 text-2xl">Loading weather...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* Greeting */}
      <div className="text-center mb-10">
        <p className="text-6xl mb-3">{greetingEmoji} {greeting}</p>
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
            <div className="text-8xl mb-6">{getEventEmoji(nowItem.title, nowItem.isMeal)}</div>
            <h2 className="text-5xl font-bold mb-4">{nowItem.title}</h2>
            <p className="text-3xl text-white/60 mb-3">{nowItem.time}</p>
            {nowItem.location && (
              <p className="text-2xl text-white/40">📍 {nowItem.location}</p>
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
            <div className={`mb-6 ${nowItem ? "text-6xl" : "text-8xl"}`}>{getEventEmoji(nextItem.title, nextItem.isMeal)}</div>
            <h2 className={`font-bold mb-4 ${nowItem ? "text-3xl" : "text-5xl"}`}>{nextItem.title}</h2>
            <p className={`text-white/60 mb-3 ${nowItem ? "text-xl" : "text-3xl"}`}>{nextItem.day} {nextItem.time}</p>
            {nextItem.location && (
              <p className={`text-white/40 ${nowItem ? "text-lg" : "text-2xl"}`}>📍 {nextItem.location}</p>
            )}
          </div>
        )}
        
        {!nowItem && !nextItem && (
          <div className="text-center">
            <div className="text-8xl mb-6">😴</div>
            <h2 className="text-5xl font-bold text-white/60">No Scheduled Events</h2>
            <p className="text-2xl text-white/40 mt-4">Enjoy your free time!</p>
          </div>
        )}
      </div>

      {/* Right side - Upcoming Schedule */}
      {upcoming.length > 0 && (
        <div className="w-[450px] flex flex-col">
          <h3 className="text-xl font-semibold text-white/60 mb-6 flex items-center gap-3">
            📅 {showingFuture ? "UPCOMING SCHEDULE" : "TODAY'S SCHEDULE"}
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
                  <span className="text-3xl">{getEventEmoji(item.title, item.isMeal)}</span>
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
        <div className="text-9xl mb-8">🍽️</div>
        <h2 className="text-5xl font-bold text-white/60">No Upcoming Meals</h2>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-9xl mb-8">
        {getEventEmoji(nextMeal.title, true)}
      </div>
      <h2 className="text-6xl font-bold mb-4">{nextMeal.title}</h2>
      <p className="text-3xl text-white/60 mb-3">{nextMeal.time}</p>
      {nextMeal.location && (
        <p className="text-xl text-white/40 mb-10">📍 {nextMeal.location}</p>
      )}
      
      {/* Menu Display */}
      {mealData ? (
        <div className="mt-4 p-10 rounded-2xl bg-white/5 border border-white/10 max-w-3xl w-full">
          <h3 className="text-3xl font-semibold mb-8 text-center border-b border-white/10 pb-6">Menu</h3>
          <div className="space-y-6">
            <div className="flex items-start gap-5">
              <span className="text-3xl">🍖</span>
              <div>
                <p className="text-white/50 text-base uppercase tracking-wider">Main Dish</p>
                <p className="text-2xl font-medium">{mealData.main_dish}</p>
              </div>
            </div>
            
            {mealData.sides && mealData.sides.length > 0 && (
              <div className="flex items-start gap-5">
                <span className="text-3xl">🥗</span>
                <div>
                  <p className="text-white/50 text-base uppercase tracking-wider">Sides</p>
                  <p className="text-xl">{mealData.sides.join(", ")}</p>
                </div>
              </div>
            )}
            
            {mealData.dessert && (
              <div className="flex items-start gap-5">
                <span className="text-3xl">🍰</span>
                <div>
                  <p className="text-white/50 text-base uppercase tracking-wider">Dessert</p>
                  <p className="text-xl">{mealData.dessert}</p>
                </div>
              </div>
            )}
            
            {mealData.drinks && mealData.drinks.length > 0 && (
              <div className="flex items-start gap-5">
                <span className="text-3xl">🥤</span>
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
    { label: "Reading Scripture [A]", value: volunteerSchedule.readingScriptureA },
    { label: "Presenting Lesson [A]", value: volunteerSchedule.presentingLessonA, subtitle: volunteerSchedule.lessonTitleA },
    { label: "Reading Scripture [B]", value: volunteerSchedule.readingScriptureB },
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
