'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Cloud, CloudRain, Sun, CloudSun, Snowflake, CloudLightning, Wind, Droplets, RefreshCw } from 'lucide-react'

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

function getWeatherIcon(weatherId: number, iconCode: string) {
  const isDay = iconCode.endsWith('d')
  const iconClass = "h-6 w-6"

  // Weather condition codes: https://openweathermap.org/weather-conditions
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

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: true,
    timeZone: 'America/Chicago',
  })
}

export function WeatherForecast() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchWeather = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/weather')
      if (!response.ok) throw new Error('Failed to fetch weather')
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      setWeather(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weather')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeather()
    // Refresh every 5 minutes
    const interval = setInterval(fetchWeather, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !weather) {
    return (
      <Card className="border-blue-200/50 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Weather at Lake Williamson
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading weather...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !weather) {
    return (
      <Card className="border-red-200/50 bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error || 'Unable to load weather'}</p>
        </CardContent>
      </Card>
    )
  }

  const current = weather.current
  const hourly = weather.hourly.slice(0, 5) // Next 5 hours

  return (
    <Card className="border-blue-200/50 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Cloud className="h-4 w-4 text-blue-500" />
            Weather at Lake Williamson
          </CardTitle>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Weather */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {getWeatherIcon(current.weather[0].id, current.weather[0].icon)}
            <span className="text-3xl font-bold">{Math.round(current.temp)}°F</span>
          </div>
          <div className="text-sm text-muted-foreground space-y-0.5">
            <p className="capitalize">{current.weather[0].description}</p>
            <p className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Droplets className="h-3 w-3" />
                {current.humidity}%
              </span>
              <span className="flex items-center gap-1">
                <Wind className="h-3 w-3" />
                {Math.round(current.wind_speed)} mph
              </span>
            </p>
          </div>
        </div>

        {/* Hourly Forecast */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Next 5 Hours</p>
          <div className="grid grid-cols-5 gap-2">
            {hourly.map((hour) => (
              <div key={hour.dt} className="text-center p-2 rounded-lg bg-background/50">
                <p className="text-xs font-medium text-muted-foreground">{formatTime(hour.dt)}</p>
                <div className="flex justify-center my-1">
                  {getWeatherIcon(hour.weather[0].id, hour.weather[0].icon)}
                </div>
                <p className="text-sm font-semibold">{Math.round(hour.temp)}°</p>
                {hour.pop > 0.1 && (
                  <p className="text-xs text-blue-500 flex items-center justify-center gap-0.5">
                    <Droplets className="h-2.5 w-2.5" />
                    {Math.round(hour.pop * 100)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Component to show inline weather for a specific date and time
// date format: "2026-05-07" (YYYY-MM-DD)
// hour: 14 for 2 PM, 17 for 5 PM, etc.
export function InlineWeather({ date, hour }: { date: string; hour: number }) {
  const [weather, setWeather] = useState<WeatherData | null>(null)

  useEffect(() => {
    fetch('/api/weather')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setWeather(data)
      })
      .catch(() => {})
  }, [])

  if (!weather) return null

  // Parse the target date and hour
  const [year, month, day] = date.split('-').map(Number)
  const targetDate = new Date(year, month - 1, day, hour, 0, 0, 0)
  const targetTimestamp = Math.floor(targetDate.getTime() / 1000)

  // Find the forecast closest to the target date+time
  // The 2.5 API gives 3-hour intervals, so find the closest one
  let closestForecast = weather.hourly[0]
  let smallestDiff = Math.abs(weather.hourly[0].dt - targetTimestamp)

  for (const forecast of weather.hourly) {
    const diff = Math.abs(forecast.dt - targetTimestamp)
    if (diff < smallestDiff) {
      smallestDiff = diff
      closestForecast = forecast
    }
  }

  // Only show if forecast is within 3 hours of target time (data is available)
  // If target is too far in the future, don't show anything
  const threeHoursInSeconds = 3 * 60 * 60
  if (smallestDiff > threeHoursInSeconds) {
    return (
      <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-gray-100/50 dark:bg-gray-800/30 text-xs text-muted-foreground">
        <Cloud className="h-4 w-4" />
        <span>Forecast unavailable</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-blue-100/50 dark:bg-blue-900/30 text-xs">
      {getWeatherIcon(closestForecast.weather[0].id, closestForecast.weather[0].icon)}
      <span className="font-medium">{Math.round(closestForecast.temp)}°F</span>
      {closestForecast.pop > 0.2 && (
        <span className="text-blue-500 flex items-center gap-0.5">
          <Droplets className="h-2.5 w-2.5" />
          {Math.round(closestForecast.pop * 100)}%
        </span>
      )}
    </span>
  )
}
