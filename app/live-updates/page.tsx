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
  Megaphone,
  UtensilsCrossed
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

type ViewType = "all" | "weather" | "schedule" | "meal" | "announcements"

function getCentralTime(): Date {
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

  // Determine available views (exclude announcements if empty)
  const availableViews = useMemo<ViewType[]>(() => {
    const base: ViewType[] = ["all", "weather", "schedule", "meal"]
    if (announcements.length > 0) {
      base.push("announcements")
    }
    return base
  }, [announcements.length])

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
      const centralDateStr = centralNow.toISOString().split('T')[0]

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

      setNowItem(current)
      setNextItem(next)
      setNextMeal(meal)
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
          break
        case "2":
          setCurrentView("weather")
          break
        case "3":
          setCurrentView("schedule")
          break
        case "4":
          setCurrentView("meal")
          break
        case "5":
          if (announcements.length > 0) {
            setCurrentView("announcements")
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
  }, [toggleFullscreen, availableViews, announcements.length])

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
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-wide">RENDEZVOUS 2026</h1>
          <span className="text-white/50">|</span>
          <span className="text-white/70">Live Updates</span>
        </div>
        <div className="text-right">
          <div className="text-3xl font-light tracking-wider">{formattedTime}</div>
          <div className="text-white/60 text-sm">{formattedDate}</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {currentView === "all" && (
          <AllView 
            weather={weather} 
            nowItem={nowItem} 
            nextItem={nextItem} 
            nextMeal={nextMeal} 
          />
        )}
        {currentView === "weather" && (
          <WeatherView weather={weather} />
        )}
        {currentView === "schedule" && (
          <ScheduleView nowItem={nowItem} nextItem={nextItem} />
        )}
        {currentView === "meal" && (
          <MealView nextMeal={nextMeal} />
        )}
        {currentView === "announcements" && (
          <AnnouncementsView announcements={announcements} />
        )}
      </main>

      {/* Keyboard Controls Footer - hidden in fullscreen */}
      {!isFullscreen && (
      <footer className="px-8 py-4 border-t border-white/10">
        <div className="flex items-center gap-4 justify-center flex-wrap">
          <span className="text-white/50 text-sm">Keyboard Controls:</span>
          <KeyButton label="1 All" active={currentView === "all"} />
          <KeyButton label="2 Weather" active={currentView === "weather"} />
          <KeyButton label="3 Schedule" active={currentView === "schedule"} />
          <KeyButton label="4 Meal" active={currentView === "meal"} />
          {announcements.length > 0 && (
            <KeyButton label="5 Announcements" active={currentView === "announcements"} />
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
    <span className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
      active 
        ? "bg-orange-600 text-white" 
        : "bg-white/10 text-white/80 hover:bg-white/20"
    }`}>
      {label}
    </span>
  )
}

// All View - 3 column dashboard
function AllView({ 
  weather, 
  nowItem, 
  nextItem, 
  nextMeal 
}: { 
  weather: WeatherData | null
  nowItem: ScheduleItem | null
  nextItem: ScheduleItem | null
  nextMeal: ScheduleItem | null
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Weather Card */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-2 text-white/60 text-sm mb-6">
          <Droplets className="h-4 w-4" />
          <span className="uppercase tracking-wider font-medium">Weather</span>
        </div>
        {weather ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {getWeatherIcon(weather.current.weather[0].id, weather.current.weather[0].icon, "md")}
              <span className="text-5xl font-bold">{Math.round(weather.current.temp)}°</span>
            </div>
            <p className="text-white/70 capitalize">{weather.current.weather[0].description}</p>
            <div className="grid grid-cols-3 gap-2">
              {weather.hourly.slice(0, 3).map((hour) => (
                <div key={hour.dt} className="text-center p-3 rounded-xl bg-white/5">
                  <p className="text-xs text-white/50">{formatTime(hour.dt)}</p>
                  <div className="flex justify-center my-2">
                    {getWeatherIcon(hour.weather[0].id, hour.weather[0].icon, "sm")}
                  </div>
                  <p className="font-semibold">{Math.round(hour.temp)}°</p>
                  {hour.pop > 0.1 && (
                    <p className="text-xs text-blue-400 flex items-center justify-center gap-0.5">
                      <Droplets className="h-2.5 w-2.5" />
                      {Math.round(hour.pop * 100)}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-white/50">Loading weather...</p>
        )}
      </div>

      {/* Schedule Card */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-2 text-white/60 text-sm mb-6">
          <Calendar className="h-4 w-4" />
          <span className="uppercase tracking-wider font-medium">Schedule</span>
        </div>
        <div className="space-y-4">
          {nowItem && (
            <div className="p-4 rounded-xl bg-white/10 border border-white/20">
              <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
                <ChevronRight className="h-3 w-3" />
                <span>{nowItem.time}</span>
              </div>
              <h3 className="font-semibold text-lg">{nowItem.title}</h3>
              {nowItem.location && (
                <p className="text-white/50 text-sm">{nowItem.location}</p>
              )}
            </div>
          )}
          {nextItem && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
                <ChevronRight className="h-3 w-3" />
                <span>{nextItem.time}</span>
              </div>
              <h3 className="font-semibold text-lg">{nextItem.title}</h3>
              {nextItem.location && (
                <p className="text-white/50 text-sm">{nextItem.location}</p>
              )}
            </div>
          )}
          {!nowItem && !nextItem && (
            <p className="text-white/50">No upcoming events</p>
          )}
        </div>
      </div>

      {/* Next Meal Card */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-2 text-white/60 text-sm mb-6">
          <Clock className="h-4 w-4" />
          <span className="uppercase tracking-wider font-medium">Next Meal</span>
        </div>
        {nextMeal ? (
          <div className="flex flex-col items-center justify-center h-[calc(100%-3rem)] text-center">
            <div className="text-6xl mb-4">
              <UtensilsCrossed className="h-16 w-16 text-white/70" />
            </div>
            <h3 className="text-2xl font-bold mb-2">{nextMeal.title}</h3>
            <p className="text-white/60 text-lg">{nextMeal.time}</p>
            {nextMeal.location && (
              <p className="text-white/40 text-sm mt-1">{nextMeal.location}</p>
            )}
          </div>
        ) : (
          <p className="text-white/50">No upcoming meals</p>
        )}
      </div>
    </div>
  )
}

// Weather View - Full screen weather
function WeatherView({ weather }: { weather: WeatherData | null }) {
  if (!weather) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/50 text-2xl">Loading weather...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="flex items-center gap-8 mb-4">
        {getWeatherIcon(weather.current.weather[0].id, weather.current.weather[0].icon, "lg")}
        <span className="text-[10rem] font-light leading-none">{Math.round(weather.current.temp)}°</span>
      </div>
      <p className="text-3xl text-white/80 capitalize mb-8">{weather.current.weather[0].description}</p>
      
      <div className="flex items-center gap-12 text-xl text-white/60 mb-12">
        <span className="flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          {weather.current.humidity}% Humidity
        </span>
        <span className="flex items-center gap-2">
          <Wind className="h-5 w-5" />
          {Math.round(weather.current.wind_speed)} mph Wind
        </span>
      </div>

      <div className="flex gap-4">
        {weather.hourly.slice(0, 6).map((hour) => (
          <div key={hour.dt} className="text-center p-4 rounded-2xl bg-white/5 min-w-[100px]">
            <p className="text-sm text-white/50 mb-2">{formatTime(hour.dt)}</p>
            <div className="flex justify-center mb-2">
              {getWeatherIcon(hour.weather[0].id, hour.weather[0].icon, "sm")}
            </div>
            <p className="text-2xl font-semibold mb-1">{Math.round(hour.temp)}°</p>
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
  )
}

// Schedule View - Full screen schedule
function ScheduleView({ 
  nowItem, 
  nextItem 
}: { 
  nowItem: ScheduleItem | null
  nextItem: ScheduleItem | null
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      {nowItem && (
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 text-white/50 text-lg mb-4">
            <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            <span>HAPPENING NOW</span>
          </div>
          <h2 className="text-5xl font-bold mb-4">{nowItem.title}</h2>
          <p className="text-2xl text-white/60 mb-2">{nowItem.time}</p>
          {nowItem.location && (
            <p className="text-xl text-white/40">{nowItem.location}</p>
          )}
        </div>
      )}
      
      {nextItem && (
        <div className="text-center">
          {nowItem && <div className="w-24 h-px bg-white/20 mx-auto mb-12" />}
          <div className="flex items-center justify-center gap-2 text-white/50 text-lg mb-4">
            <ChevronRight className="h-5 w-5" />
            <span>UP NEXT</span>
          </div>
          <h2 className={`font-bold mb-4 ${nowItem ? "text-3xl" : "text-5xl"}`}>{nextItem.title}</h2>
          <p className={`text-white/60 mb-2 ${nowItem ? "text-xl" : "text-2xl"}`}>{nextItem.time}</p>
          {nextItem.location && (
            <p className={`text-white/40 ${nowItem ? "text-lg" : "text-xl"}`}>{nextItem.location}</p>
          )}
        </div>
      )}
      
      {!nowItem && !nextItem && (
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white/60">No Scheduled Events</h2>
          <p className="text-xl text-white/40 mt-4">Enjoy your free time!</p>
        </div>
      )}
    </div>
  )
}

// Meal View - Full screen meal display
function MealView({ nextMeal }: { nextMeal: ScheduleItem | null }) {
  if (!nextMeal) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <UtensilsCrossed className="h-24 w-24 text-white/30 mb-8" />
        <h2 className="text-4xl font-bold text-white/60">No Upcoming Meals</h2>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-8xl mb-8">
        <UtensilsCrossed className="h-32 w-32 text-white/70" />
      </div>
      <h2 className="text-6xl font-bold mb-4">{nextMeal.title}</h2>
      <p className="text-3xl text-white/60 mb-4">{nextMeal.time}</p>
      {nextMeal.location && (
        <p className="text-xl text-white/40">{nextMeal.location}</p>
      )}
      
      {/* Placeholder for future menu data */}
      {/* 
      <div className="mt-12 p-8 rounded-2xl bg-white/5 border border-white/10 max-w-2xl">
        <h3 className="text-xl font-semibold mb-4 text-center">Menu</h3>
        <div className="grid grid-cols-2 gap-4">
          {menuItems.map(item => (
            <p key={item} className="text-white/70">{item}</p>
          ))}
        </div>
      </div>
      */}
    </div>
  )
}

// Announcements View - Only shows when there are announcements
function AnnouncementsView({ announcements }: { announcements: Announcement[] }) {
  if (announcements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Megaphone className="h-24 w-24 text-amber-400 mb-8" />
        <h2 className="text-4xl font-bold text-amber-400">Announcements</h2>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Megaphone className="h-12 w-12 text-amber-400" />
        <h2 className="text-4xl font-bold text-amber-400">Announcements</h2>
      </div>
      
      <div className="w-full space-y-6">
        {announcements.map((announcement) => (
          <div 
            key={announcement.id} 
            className={`p-6 rounded-2xl border ${
              announcement.priority === "urgent" 
                ? "bg-red-500/10 border-red-500/50" 
                : announcement.priority === "high"
                ? "bg-orange-500/10 border-orange-500/50"
                : "bg-white/5 border-white/10"
            }`}
          >
            <h3 className="text-2xl font-bold mb-2">{announcement.title}</h3>
            <p className="text-lg text-white/70 whitespace-pre-wrap">{announcement.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
