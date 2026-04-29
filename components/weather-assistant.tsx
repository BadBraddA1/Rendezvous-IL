'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sun, CloudRain, Cloud, ThumbsUp, ThumbsDown, Meh, RefreshCw } from 'lucide-react'

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

// Ray's avatar - a friendly sun character
function RayAvatar({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <div className={`${className} rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg`}>
      <Sun className="h-6 w-6 text-white" />
    </div>
  )
}

type WeatherAssistantProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WeatherAssistant({ open, onOpenChange }: WeatherAssistantProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <RayAvatar />
            <div>
              <span className="text-xl">Ray</span>
              <p className="text-xs font-normal text-muted-foreground">Your Rendezvous Weather Guide</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-primary mr-3" />
            <span className="text-muted-foreground">Ray is checking the skies...</span>
          </div>
        ) : error || !data ? (
          <div className="text-center py-8 text-muted-foreground">
            <Cloud className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Ray is taking a break. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Ray's message */}
            <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200/50 dark:border-yellow-800/50">
              <CardContent className="py-4">
                <p className="text-lg leading-relaxed">
                  &ldquo;{data.funnyPhrase}&rdquo;
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  - Ray, reporting from {data.location}
                </p>
              </CardContent>
            </Card>

            {/* Today and Tomorrow forecast */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Today */}
              {data.today && (
                <div className={`rounded-lg border p-4 ${getRatingColor(data.today.outdoor.rating)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold">Today</span>
                    <div className="flex items-center gap-1.5">
                      {getRatingIcon(data.today.outdoor.rating)}
                      <span className="text-xs font-medium">{getRatingLabel(data.today.outdoor.rating)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    {data.today.rainChance > 30 ? (
                      <CloudRain className="h-10 w-10 text-blue-500" />
                    ) : (
                      <Sun className="h-10 w-10 text-yellow-500" />
                    )}
                    <div>
                      <p className="font-bold text-3xl">{data.today.temp}°F</p>
                      <p className="text-sm text-muted-foreground capitalize">{data.today.conditions}</p>
                    </div>
                  </div>
                  {data.today.rainChance > 0 && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                      {data.today.rainChance}% chance of rain
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {data.today.outdoor.advice}
                  </p>
                </div>
              )}

              {/* Tomorrow */}
              {data.tomorrow && (
                <div className={`rounded-lg border p-4 ${getRatingColor(data.tomorrow.outdoor.rating)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold">Tomorrow</span>
                    <div className="flex items-center gap-1.5">
                      {getRatingIcon(data.tomorrow.outdoor.rating)}
                      <span className="text-xs font-medium">{getRatingLabel(data.tomorrow.outdoor.rating)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    {data.tomorrow.rainChance > 30 ? (
                      <CloudRain className="h-10 w-10 text-blue-500" />
                    ) : (
                      <Sun className="h-10 w-10 text-yellow-500" />
                    )}
                    <div>
                      <p className="font-bold text-3xl">{data.tomorrow.temp}°F</p>
                      <p className="text-sm text-muted-foreground capitalize">{data.tomorrow.conditions}</p>
                    </div>
                  </div>
                  {data.tomorrow.rainChance > 0 && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                      {data.tomorrow.rainChance}% chance of rain
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {data.tomorrow.outdoor.advice}
                  </p>
                </div>
              )}
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Weather data updates every 4 hours
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
