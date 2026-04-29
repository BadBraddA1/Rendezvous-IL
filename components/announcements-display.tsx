'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, Bell, Info, AlertTriangle } from 'lucide-react'

type Announcement = {
  id: number
  title: string
  message: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  is_active: boolean
  expires_at: string | null
  created_at: string
}

const priorityConfig = {
  low: {
    icon: Info,
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
  },
  normal: {
    icon: Bell,
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
  },
  high: {
    icon: AlertTriangle,
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-300 dark:border-yellow-700',
    text: 'text-yellow-700 dark:text-yellow-300',
  },
  urgent: {
    icon: AlertCircle,
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-300 dark:border-red-700',
    text: 'text-red-700 dark:text-red-300',
  },
}

export function AnnouncementsDisplay({ variant = 'default' }: { variant?: 'default' | 'compact' | 'large' }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch('/api/announcements')
        const data = await res.json()
        if (data.announcements) {
          setAnnouncements(data.announcements)
        }
      } catch {}
    }
    fetchAnnouncements()
    // Refresh every 30 seconds
    const interval = setInterval(fetchAnnouncements, 30000)
    return () => clearInterval(interval)
  }, [])

  if (announcements.length === 0) return null

  if (variant === 'large') {
    // For /LU page - big display for screens
    return (
      <div className="space-y-6">
        {announcements.map((a) => {
          const config = priorityConfig[a.priority]
          const Icon = config.icon
          return (
            <div
              key={a.id}
              className={`rounded-2xl p-8 ${a.priority === 'urgent' ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10'}`}
            >
              <div className="flex items-start gap-6">
                <Icon className={`h-12 w-12 flex-shrink-0 ${a.priority === 'urgent' ? 'text-white' : 'text-yellow-400'}`} />
                <div>
                  <h3 className="text-3xl font-bold mb-2">{a.title}</h3>
                  <p className="text-2xl opacity-90">{a.message}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (variant === 'compact') {
    // For inline use
    return (
      <div className="space-y-2">
        {announcements.map((a) => {
          const config = priorityConfig[a.priority]
          const Icon = config.icon
          return (
            <div
              key={a.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${config.bg} ${config.border} border`}
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${config.text}`} />
              <span className={`font-medium ${config.text}`}>{a.title}:</span>
              <span className={config.text}>{a.message}</span>
            </div>
          )
        })}
      </div>
    )
  }

  // Default variant for /schedule page
  return (
    <div className="space-y-3">
      {announcements.map((a) => {
        const config = priorityConfig[a.priority]
        const Icon = config.icon
        return (
          <Card key={a.id} className={`${config.bg} ${config.border} border-2`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${config.text}`} />
                <div>
                  <h4 className={`font-semibold ${config.text}`}>{a.title}</h4>
                  <p className={`text-sm mt-1 ${config.text} opacity-90`}>{a.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
