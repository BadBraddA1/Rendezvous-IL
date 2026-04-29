'use client'

import { useEffect, useState, useCallback } from 'react'
import { Cloud, CloudRain, Sun, CloudSun, Snowflake, CloudLightning, Wind, Droplets, Clock, ChevronRight, Calendar, Thermometer, Megaphone } from 'lucide-react'
import { AnnouncementsDisplay } from '@/components/announcements-display'

// Schedule data from NowNextSchedule
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
}

interface WeatherHour {
  dt: number
  temp: number
  feels_like: number
  humidity: number
  weather: { id: number; main: string; description: string; icon: string }[]
  pop: number
  wind_speed: number
}

interface WeatherData {
  current: {
    dt: number
    temp: number
    feels_like: number
    humidity: number
    weather: { id: number; main: string; description: string; icon: string }[]
    wind_speed: number
  }
  hourly: WeatherHour[]
}

const SCHEDULE_ITEMS: ScheduleItem[] = [
  // Monday May 4
  { date: '2026-05-04', day: 'Monday', time: '1:00 PM - 5:15 PM', startHour: 13, startMinute: 0, endHour: 17, endMinute: 15, title: 'Check-in at Activity Center', location: 'Activity Center' },
  { date: '2026-05-04', day: 'Monday', time: '4:00 PM - 5:00 PM', startHour: 16, startMinute: 0, endHour: 17, endMinute: 0, title: 'Ice Breaker Game', location: 'AC Room 205/206' },
  { date: '2026-05-04', day: 'Monday', time: '5:30 PM', startHour: 17, startMinute: 30, title: 'Dinner', location: 'Lakeside Dining Room' },
  { date: '2026-05-04', day: 'Monday', time: '7:00 PM', startHour: 19, startMinute: 0, title: 'Evening Assembly & Introductions', location: 'AC Room 207' },
  { date: '2026-05-04', day: 'Monday', time: '8:00 PM', startHour: 20, startMinute: 0, title: 'Black-light Dodgeball & Games', location: 'Activity Center' },
  { date: '2026-05-04', day: 'Monday', time: '9:00 PM', startHour: 21, startMinute: 0, title: 'Nine Square & Knockout', location: 'Activity Center' },
  // Tuesday May 5
  { date: '2026-05-05', day: 'Tuesday', time: '7:30 AM', startHour: 7, startMinute: 30, title: 'Breakfast', location: 'Lakeside Dining Room' },
  { date: '2026-05-05', day: 'Tuesday', time: '9:00 AM', startHour: 9, startMinute: 0, title: 'Morning Assembly & Announcements', location: 'AC Room 207' },
  { date: '2026-05-05', day: 'Tuesday', time: '10:00 AM', startHour: 10, startMinute: 0, title: 'Young Adult & Mom\'s Session', location: 'Activity Center' },
  { date: '2026-05-05', day: 'Tuesday', time: '12:00 PM', startHour: 12, startMinute: 0, title: 'Lunch', location: 'Lakeside Dining Room' },
  { date: '2026-05-05', day: 'Tuesday', time: '1:30 PM', startHour: 13, startMinute: 30, title: 'Archery, Obstacle Course & Rope Games', location: 'Various' },
  { date: '2026-05-05', day: 'Tuesday', time: '5:30 PM', startHour: 17, startMinute: 30, title: 'Dinner', location: 'Lakeside Dining Room' },
  { date: '2026-05-05', day: 'Tuesday', time: '7:00 PM', startHour: 19, startMinute: 0, title: 'Evening Assembly & Announcements', location: 'AC Room 207' },
  { date: '2026-05-05', day: 'Tuesday', time: '8:00 PM', startHour: 20, startMinute: 0, title: 'Gym Time & Table Games', location: 'Activity Center' },
  // Wednesday May 6
  { date: '2026-05-06', day: 'Wednesday', time: '7:30 AM', startHour: 7, startMinute: 30, title: 'Breakfast', location: 'Lakeside Dining Room' },
  { date: '2026-05-06', day: 'Wednesday', time: '9:00 AM', startHour: 9, startMinute: 0, title: 'Morning Assembly & Group Picture', location: 'AC Room 207' },
  { date: '2026-05-06', day: 'Wednesday', time: '10:00 AM', startHour: 10, startMinute: 0, title: 'General / Family Session', location: 'Activity Center' },
  { date: '2026-05-06', day: 'Wednesday', time: '12:00 PM', startHour: 12, startMinute: 0, title: 'Lunch', location: 'Lakeside Dining Room' },
  { date: '2026-05-06', day: 'Wednesday', time: '1:30 PM', startHour: 13, startMinute: 30, title: 'Afternoon Activities', location: 'Various' },
  { date: '2026-05-06', day: 'Wednesday', time: '5:30 PM', startHour: 17, startMinute: 30, title: 'Dinner', location: 'Lakeside Dining Room' },
  { date: '2026-05-06', day: 'Wednesday', time: '7:00 PM', startHour: 19, startMinute: 0, title: 'Evening Assembly & Announcements', location: 'AC Room 207' },
  { date: '2026-05-06', day: 'Wednesday', time: '8:00 PM', startHour: 20, startMinute: 0, title: 'Game Night & Bonfire', location: 'Activity Center' },
  // Thursday May 7
  { date: '2026-05-07', day: 'Thursday', time: '7:30 AM', startHour: 7, startMinute: 30, title: 'Breakfast', location: 'Lakeside Dining Room' },
  { date: '2026-05-07', day: 'Thursday', time: '9:00 AM', startHour: 9, startMinute: 0, title: 'Morning Assembly & Announcements', location: 'AC Room 207' },
  { date: '2026-05-07', day: 'Thursday', time: '10:00 AM', startHour: 10, startMinute: 0, title: 'Session Time', location: 'Activity Center' },
  { date: '2026-05-07', day: 'Thursday', time: '12:00 PM', startHour: 12, startMinute: 0, title: 'Lunch', location: 'Lakeside Dining Room' },
  { date: '2026-05-07', day: 'Thursday', time: '1:30 PM', startHour: 13, startMinute: 30, title: 'Afternoon Activities', location: 'Various' },
  { date: '2026-05-07', day: 'Thursday', time: '5:30 PM', startHour: 17, startMinute: 30, title: 'Cookout by the Lake', location: 'Lakeside' },
  { date: '2026-05-07', day: 'Thursday', time: '7:00 PM', startHour: 19, startMinute: 0, title: 'Bonfire & Evening Assembly', location: 'Bonfire Area' },
  { date: '2026-05-07', day: 'Thursday', time: '8:00 PM', startHour: 20, startMinute: 0, title: 'Capture the Flag', location: 'Rec Field' },
  // Friday May 8
  { date: '2026-05-08', day: 'Friday', time: '7:30 AM', startHour: 7, startMinute: 30, title: 'Breakfast', location: 'Lakeside Dining Room' },
  { date: '2026-05-08', day: 'Friday', time: '9:00 AM', startHour: 9, startMinute: 0, title: 'Final Assembly & Farewell', location: 'AC Room 207' },
  { date: '2026-05-08', day: 'Friday', time: '11:00 AM', startHour: 11, startMinute: 0, title: 'Event Concludes / Checkout', location: 'Various' },
]

type ViewMode = 'all' | 'weather' | 'schedule' | 'meal' | 'announcements'

function getCentralTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
}

function getWeatherIcon(weatherId: number, iconCode: string, size: string = 'h-16 w-16') {
  const isDay = iconCode.includes('d')
  
  if (weatherId >= 200 && weatherId < 300) {
    return <CloudLightning className={`${size} text-yellow-400`} />
  } else if (weatherId >= 300 && weatherId < 600) {
    return <CloudRain className={`${size} text-blue-400`} />
  } else if (weatherId >= 600 && weatherId < 700) {
    return <Snowflake className={`${size} text-blue-200`} />
  } else if (weatherId >= 700 && weatherId < 800) {
    return <Wind className={`${size} text-gray-400`} />
  } else if (weatherId === 800) {
    return isDay ? <Sun className={`${size} text-yellow-400`} /> : <Cloud className={`${size} text-gray-300`} />
  } else if (weatherId > 800) {
    return isDay ? <CloudSun className={`${size} text-gray-300`} /> : <Cloud className={`${size} text-gray-400`} />
  }
  return <Cloud className={`${size} text-gray-400`} />
}

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: true,
    timeZone: 'America/Chicago',
  })
}

export default function LiveUpdatesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [currentTime, setCurrentTime] = useState<Date>(getCentralTime())
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [nowItem, setNowItem] = useState<ScheduleItem | null>(null)
  const [nextItems, setNextItems] = useState<ScheduleItem[]>([])
  const [autoRotate, setAutoRotate] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [scheduleRotateIndex, setScheduleRotateIndex] = useState(0)
  const [hiddenTabs, setHiddenTabs] = useState<Set<ViewMode>>(new Set())

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch(() => {})
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      }).catch(() => {})
    }
  }, [])

  // Listen for fullscreen changes (e.g., user presses Escape in fullscreen)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Map number keys to view modes
  const keyToView: Record<string, ViewMode> = {
    '1': 'all',
    '2': 'weather',
    '3': 'schedule',
    '4': 'meal',
    '5': 'announcements'
  }

  // Keyboard controls
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Shift + number = hide that tab
    if (e.shiftKey && keyToView[e.key]) {
      const viewToHide = keyToView[e.key]
      setHiddenTabs(prev => {
        const newSet = new Set(prev)
        newSet.add(viewToHide)
        return newSet
      })
      // If currently viewing the hidden tab, switch to 'all'
      if (viewMode === viewToHide) {
        setViewMode('all')
      }
      return
    }

    switch (e.key) {
      case '1':
        if (!hiddenTabs.has('all')) {
          setViewMode('all')
          setAutoRotate(false)
        }
        break
      case '2':
        if (!hiddenTabs.has('weather')) {
          setViewMode('weather')
          setAutoRotate(false)
        }
        break
      case '3':
        if (!hiddenTabs.has('schedule')) {
          setViewMode('schedule')
          setAutoRotate(false)
        }
        break
      case '4':
        if (!hiddenTabs.has('meal')) {
          setViewMode('meal')
          setAutoRotate(false)
        }
        break
      case '5':
        if (!hiddenTabs.has('announcements')) {
          setViewMode('announcements')
          setAutoRotate(false)
        }
        break
      case '0':
      case 'a':
      case 'A':
        setAutoRotate(true)
        break
      case 'f':
      case 'F':
        toggleFullscreen()
        break
      case 'Escape':
        if (!document.fullscreenElement) {
          setAutoRotate(true)
          setViewMode('all')
        }
        break
    }
  }, [toggleFullscreen, hiddenTabs, viewMode])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Auto-rotate views
  useEffect(() => {
    if (!autoRotate) return
    
    const allViews: ViewMode[] = ['all', 'weather', 'schedule', 'announcements']
    // Filter out hidden tabs
    const views = allViews.filter(v => !hiddenTabs.has(v))
    if (views.length === 0) return
    
    let currentIndex = 0
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % views.length
      setViewMode(views[currentIndex])
    }, 10000) // Rotate every 10 seconds
    
    return () => clearInterval(interval)
  }, [autoRotate, hiddenTabs])

  // Rotate through schedule items when in schedule view or fullscreen
  useEffect(() => {
    if (viewMode !== 'schedule' && !isFullscreen) return
    
    const interval = setInterval(() => {
      setScheduleRotateIndex(prev => {
        const totalItems = nextItems.length + (nowItem ? 1 : 0)
        if (totalItems === 0) return 0
        return (prev + 1) % totalItems
      })
    }, 5000) // Rotate schedule items every 5 seconds
    
    return () => clearInterval(interval)
  }, [viewMode, isFullscreen, nextItems.length, nowItem])

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCentralTime())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

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

  // Update schedule
  useEffect(() => {
    const updateSchedule = () => {
      const centralNow = getCentralTime()
      const centralHour = centralNow.getHours()
      const centralMinute = centralNow.getMinutes()
      const centralDateStr = centralNow.toISOString().split('T')[0]
      const currentMinutes = centralHour * 60 + centralMinute

      let current: ScheduleItem | null = null
      const upcoming: ScheduleItem[] = []

      for (let i = 0; i < SCHEDULE_ITEMS.length; i++) {
        const item = SCHEDULE_ITEMS[i]
        
        if (item.date < centralDateStr) continue
        
        const itemStartMinutes = item.startHour * 60 + item.startMinute
        let itemEndMinutes = item.endHour !== undefined && item.endMinute !== undefined
          ? item.endHour * 60 + item.endMinute
          : itemStartMinutes + 60

        if (item.date === centralDateStr) {
          if (currentMinutes >= itemStartMinutes && currentMinutes < itemEndMinutes) {
            current = item
          } else if (itemStartMinutes > currentMinutes && upcoming.length < 5) {
            upcoming.push(item)
          }
        } else if (upcoming.length < 5) {
          upcoming.push(item)
        }
      }

      setNowItem(current)
      setNextItems(upcoming)
    }

    updateSchedule()
    const interval = setInterval(updateSchedule, 1000)
    return () => clearInterval(interval)
  }, [])

  // Find next meal
  const nextMeal = nextItems.find(item => 
    item.title.toLowerCase().includes('breakfast') ||
    item.title.toLowerCase().includes('lunch') ||
    item.title.toLowerCase().includes('dinner') ||
    item.title.toLowerCase().includes('cookout')
  )

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight">RENDEZVOUS 2026</h1>
            <span className="text-white/50">|</span>
            <span className="text-white/70">Live Updates</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-3xl font-mono font-bold">
                {currentTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'America/Chicago'
                })}
              </div>
              <div className="text-sm text-white/50">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric',
                  timeZone: 'America/Chicago'
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-20 px-8 min-h-screen">
        {/* All View */}
        {viewMode === 'all' && (
          <div className="grid grid-cols-3 gap-8 h-[calc(100vh-12rem)]">
            {/* Weather Column */}
            <div className="bg-white/5 rounded-3xl p-8 flex flex-col">
              <h2 className="text-lg font-semibold text-white/50 mb-6 flex items-center gap-2">
                <Thermometer className="h-5 w-5" />
                WEATHER
              </h2>
              {weather ? (
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-6 mb-8">
                    {getWeatherIcon(weather.current.weather[0].id, weather.current.weather[0].icon, 'h-24 w-24')}
                    <div>
                      <div className="text-7xl font-bold">{Math.round(weather.current.temp)}°</div>
                      <div className="text-xl text-white/70 capitalize">{weather.current.weather[0].description}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {weather.hourly.slice(0, 3).map((hour) => (
                      <div key={hour.dt} className="text-center bg-white/5 rounded-xl p-4">
                        <div className="text-sm text-white/50 mb-2">{formatTime(hour.dt)}</div>
                        {getWeatherIcon(hour.weather[0].id, hour.weather[0].icon, 'h-8 w-8 mx-auto')}
                        <div className="text-xl font-bold mt-2">{Math.round(hour.temp)}°</div>
                        {hour.pop > 0.1 && (
                          <div className="text-sm text-blue-400 flex items-center justify-center gap-1 mt-1">
                            <Droplets className="h-3 w-3" />
                            {Math.round(hour.pop * 100)}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-white/30">Loading weather...</div>
              )}
            </div>

            {/* Schedule Column */}
            <div className="bg-white/5 rounded-3xl p-8 flex flex-col">
              <h2 className="text-lg font-semibold text-white/50 mb-6 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                SCHEDULE
              </h2>
              <div className="flex-1 flex flex-col justify-center space-y-6">
                {/* Now */}
                {nowItem && (
                  <div className="bg-primary/20 border border-primary/50 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="relative">
                        <div className="h-3 w-3 bg-primary rounded-full" />
                        <div className="absolute inset-0 h-3 w-3 bg-primary rounded-full animate-ping" />
                      </div>
                      <span className="text-sm font-semibold text-primary">NOW</span>
                    </div>
                    <h3 className="text-2xl font-bold">{nowItem.title}</h3>
                    <p className="text-white/50 mt-1">{nowItem.location}</p>
                  </div>
                )}
                
                {/* Next */}
                {nextItems.slice(0, 2).map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <ChevronRight className="h-4 w-4 text-white/50" />
                      <span className="text-sm text-white/50">{item.time}</span>
                    </div>
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                    <p className="text-white/40 text-sm mt-1">{item.location}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Meal Column */}
            <div className="bg-white/5 rounded-3xl p-8 flex flex-col">
              <h2 className="text-lg font-semibold text-white/50 mb-6 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                NEXT MEAL
              </h2>
              <div className="flex-1 flex flex-col justify-center">
                {nextMeal ? (
                  <div className="text-center">
                    <div className="text-6xl mb-4">
                      {nextMeal.title.toLowerCase().includes('breakfast') ? '🍳' : 
                       nextMeal.title.toLowerCase().includes('lunch') ? '🥪' : 
                       nextMeal.title.toLowerCase().includes('cookout') ? '🔥' : '🍽️'}
                    </div>
                    <h3 className="text-3xl font-bold mb-2">{nextMeal.title}</h3>
                    <p className="text-xl text-white/70">{nextMeal.time}</p>
                    <p className="text-white/50 mt-2">{nextMeal.location}</p>
                  </div>
                ) : (
                  <div className="text-center text-white/30">No upcoming meals</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Weather Only View */}
        {viewMode === 'weather' && weather && (
          <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center">
            <div className="flex items-center gap-12 mb-12">
              {getWeatherIcon(weather.current.weather[0].id, weather.current.weather[0].icon, 'h-48 w-48')}
              <div>
                <div className="text-[12rem] font-bold leading-none">{Math.round(weather.current.temp)}°</div>
                <div className="text-4xl text-white/70 capitalize mt-4">{weather.current.weather[0].description}</div>
              </div>
            </div>
            <div className="flex items-center gap-12 text-2xl text-white/50">
              <span className="flex items-center gap-2">
                <Droplets className="h-6 w-6" />
                {weather.current.humidity}% Humidity
              </span>
              <span className="flex items-center gap-2">
                <Wind className="h-6 w-6" />
                {Math.round(weather.current.wind_speed)} mph Wind
              </span>
            </div>
            <div className="grid grid-cols-6 gap-6 mt-16">
              {weather.hourly.slice(0, 6).map((hour) => (
                <div key={hour.dt} className="text-center bg-white/5 rounded-2xl p-6">
                  <div className="text-lg text-white/50 mb-3">{formatTime(hour.dt)}</div>
                  {getWeatherIcon(hour.weather[0].id, hour.weather[0].icon, 'h-12 w-12 mx-auto')}
                  <div className="text-3xl font-bold mt-3">{Math.round(hour.temp)}°</div>
                  {hour.pop > 0.1 && (
                    <div className="text-lg text-blue-400 flex items-center justify-center gap-1 mt-2">
                      <Droplets className="h-4 w-4" />
                      {Math.round(hour.pop * 100)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Only View */}
        {viewMode === 'schedule' && (
          <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center max-w-4xl mx-auto">
            {nowItem && (
              <div className="w-full bg-primary/20 border-2 border-primary rounded-3xl p-12 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <div className="h-4 w-4 bg-primary rounded-full" />
                    <div className="absolute inset-0 h-4 w-4 bg-primary rounded-full animate-ping" />
                  </div>
                  <span className="text-xl font-semibold text-primary">HAPPENING NOW</span>
                </div>
                <h3 className="text-5xl font-bold">{nowItem.title}</h3>
                <p className="text-2xl text-white/50 mt-4">{nowItem.location}</p>
              </div>
            )}
            
            <div className="w-full space-y-4">
              <h4 className="text-xl text-white/50 font-semibold">UP NEXT</h4>
              {nextItems.slice(0, 4).map((item, i) => (
                <div key={i} className="bg-white/5 rounded-2xl p-8 flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-semibold">{item.title}</h3>
                    <p className="text-white/40 text-lg mt-1">{item.location}</p>
                  </div>
                  <div className="text-2xl text-white/70">{item.time}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meal Only View */}
{viewMode === 'meal' && nextMeal && (
  <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center">
  <div className="text-[10rem] mb-8">
  {nextMeal.title.toLowerCase().includes('breakfast') ? '🍳' :
  nextMeal.title.toLowerCase().includes('lunch') ? '🥪' :
  nextMeal.title.toLowerCase().includes('cookout') ? '🔥' : '🍽️'}
  </div>
  <h3 className="text-6xl font-bold mb-4">{nextMeal.title}</h3>
  <p className="text-4xl text-white/70">{nextMeal.time}</p>
  <p className="text-2xl text-white/50 mt-4">{nextMeal.location}</p>
  </div>
  )}

  {/* Announcements View */}
  {viewMode === 'announcements' && (
  <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center px-8">
  <div className="flex items-center gap-4 mb-8">
    <Megaphone className="h-16 w-16 text-yellow-400" />
    <h2 className="text-5xl font-bold">Announcements</h2>
  </div>
  <div className="w-full max-w-4xl">
    <AnnouncementsDisplay variant="large" />
  </div>
  </div>
  )}
      </main>

      {/* Footer Controls - hidden in fullscreen */}
      {!isFullscreen && (
      <footer className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-white/10">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <span className="text-white/50 text-sm">Keyboard Controls:</span>
            <div className="flex gap-2">
              <kbd className={`px-3 py-1 rounded text-sm ${hiddenTabs.has('all') ? 'bg-red-900/50 line-through text-white/30' : viewMode === 'all' ? 'bg-primary text-white' : 'bg-white/10'}`}>1 All</kbd>
              <kbd className={`px-3 py-1 rounded text-sm ${hiddenTabs.has('weather') ? 'bg-red-900/50 line-through text-white/30' : viewMode === 'weather' ? 'bg-primary text-white' : 'bg-white/10'}`}>2 Weather</kbd>
              <kbd className={`px-3 py-1 rounded text-sm ${hiddenTabs.has('schedule') ? 'bg-red-900/50 line-through text-white/30' : viewMode === 'schedule' ? 'bg-primary text-white' : 'bg-white/10'}`}>3 Schedule</kbd>
              <kbd className={`px-3 py-1 rounded text-sm ${hiddenTabs.has('meal') ? 'bg-red-900/50 line-through text-white/30' : viewMode === 'meal' ? 'bg-primary text-white' : 'bg-white/10'}`}>4 Meal</kbd>
              <kbd className={`px-3 py-1 rounded text-sm ${hiddenTabs.has('announcements') ? 'bg-red-900/50 line-through text-white/30' : viewMode === 'announcements' ? 'bg-primary text-white' : 'bg-white/10'}`}>5 Announcements</kbd>
              <kbd className={`px-3 py-1 rounded text-sm ${autoRotate ? 'bg-green-600 text-white' : 'bg-white/10'}`}>0/A Auto</kbd>
              <kbd className={`px-3 py-1 rounded text-sm ${isFullscreen ? 'bg-blue-600 text-white' : 'bg-white/10'}`}>F Fullscreen</kbd>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isFullscreen && (
              <span className="text-blue-400 text-sm flex items-center gap-2">
                <span className="h-2 w-2 bg-blue-400 rounded-full animate-pulse" />
                Fullscreen
              </span>
            )}
            {autoRotate && (
              <span className="text-green-400 text-sm flex items-center gap-2">
                <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                Auto-rotating
              </span>
            )}
          </div>
        </div>
      </footer>
      )}
    </div>
  )
}
