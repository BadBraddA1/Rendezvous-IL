'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Sun, CloudRain, Cloud, Sparkles, ThumbsUp, ThumbsDown, Meh, RefreshCw } from 'lucide-react'

type OutdoorRating = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'

type WeatherAssistantData = {
  generatedAt: string
  location: string
  funnyPhrase: string
  today: {
    temp: number
    conditions: string
    rainChance: number
    outdoor: {
      rating: OutdoorRating
      advice: string
    }
  } | null
  tomorrow: {
    temp: number
    conditions: string
    rainChance: number
    outdoor: {
      rating: OutdoorRating
      advice: string
    }
  } | null
}

const getRatingIcon = (rating: OutdoorRating) => {
  switch (rating) {
    case 'excellent':
      return <ThumbsUp className="h-5 w-5 text-green-500" />
    case 'good':
      return <ThumbsUp className="h-5 w-5 text-green-400" />
    case 'fair':
      return <Meh className="h-5 w-5 text-yellow-500" />
    case 'poor':
      return <ThumbsDown className="h-5 w-5 text-red-500" />
    default:
      return <Cloud className="h-5 w-5 text-gray-400" />
  }
}

const getRatingColor = (rating: OutdoorRating) => {
  switch (rating) {
    case 'excellent':
      return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700'
    case 'good':
      return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    case 'fair':
      return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    case 'poor':
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    default:
      return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
  }
}

const getRatingLabel = (rating: OutdoorRating) => {
  switch (rating) {
    case 'excellent':
      return 'Excellent'
    case 'good':
      return 'Good'
    case 'fair':
      return 'Fair'
    case 'poor':
      return 'Poor'
    default:
      return 'Unknown'
  }
}

export function WeatherAssistant() {
  const [data, setData] = useState<WeatherAssistantData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/weather/assistant')
        const json = await res.json()
        if (!json.error) {
          setData(json)
          setError(false)
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // Refresh every 4 hours
    const interval = setInterval(fetchData, 4 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Getting weather wisdom...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return null
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-primary/20 overflow-hidden">
      <CardContent className="py-5">
        <div className="space-y-4">
          {/* Fun phrase header */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg text-foreground leading-tight">
                {data.funnyPhrase}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Daily weather update for {data.location}
              </p>
            </div>
          </div>

          {/* Today and Tomorrow cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Today */}
            {data.today && (
              <div className={`rounded-lg border p-3 ${getRatingColor(data.today.outdoor.rating)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">Today</span>
                  <div className="flex items-center gap-1.5">
                    {getRatingIcon(data.today.outdoor.rating)}
                    <span className="text-xs font-medium">{getRatingLabel(data.today.outdoor.rating)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {data.today.rainChance > 30 ? (
                    <CloudRain className="h-8 w-8 text-blue-500" />
                  ) : (
                    <Sun className="h-8 w-8 text-yellow-500" />
                  )}
                  <div>
                    <p className="font-bold text-2xl">{data.today.temp}°F</p>
                    <p className="text-xs text-muted-foreground capitalize">{data.today.conditions}</p>
                  </div>
                </div>
                {data.today.rainChance > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                    {data.today.rainChance}% chance of rain
                  </p>
                )}
                <p className="text-xs text-muted-foreground italic">
                  {data.today.outdoor.advice}
                </p>
              </div>
            )}

            {/* Tomorrow */}
            {data.tomorrow && (
              <div className={`rounded-lg border p-3 ${getRatingColor(data.tomorrow.outdoor.rating)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">Tomorrow</span>
                  <div className="flex items-center gap-1.5">
                    {getRatingIcon(data.tomorrow.outdoor.rating)}
                    <span className="text-xs font-medium">{getRatingLabel(data.tomorrow.outdoor.rating)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {data.tomorrow.rainChance > 30 ? (
                    <CloudRain className="h-8 w-8 text-blue-500" />
                  ) : (
                    <Sun className="h-8 w-8 text-yellow-500" />
                  )}
                  <div>
                    <p className="font-bold text-2xl">{data.tomorrow.temp}°F</p>
                    <p className="text-xs text-muted-foreground capitalize">{data.tomorrow.conditions}</p>
                  </div>
                </div>
                {data.tomorrow.rainChance > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                    {data.tomorrow.rainChance}% chance of rain
                  </p>
                )}
                <p className="text-xs text-muted-foreground italic">
                  {data.tomorrow.outdoor.advice}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
