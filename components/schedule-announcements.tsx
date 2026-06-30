"use client"

import { useEffect, useState } from "react"
import { Megaphone } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchJsonCached } from "@/lib/fetch-json-cache"

interface Announcement {
  id: number
  title: string
  message: string
  priority: "low" | "normal" | "high" | "urgent"
  created_at: string
}

const priorityStyles = {
  urgent: {
    callout: "callout-destructive",
    icon: "text-destructive",
    title: "text-destructive",
  },
  high: {
    callout: "callout-warning",
    icon: "text-warning",
    title: "text-warning",
  },
  low: {
    callout: "callout-info",
    icon: "text-info",
    title: "text-info",
  },
  normal: {
    callout: "callout-warning",
    icon: "text-warning",
    title: "text-on-surface",
  },
} as const

export function ScheduleAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const data = await fetchJsonCached<{ announcements?: Announcement[] }>(
          "/api/announcements/schedule",
          30_000,
        )
        setAnnouncements(data.announcements || [])
      } catch (error) {
        console.error("Failed to fetch announcements:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncements()
    const interval = setInterval(fetchAnnouncements, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading || announcements.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {announcements.map((announcement) => {
        const styles = priorityStyles[announcement.priority] ?? priorityStyles.normal

        return (
          <div key={announcement.id} className={cn("rounded-xl p-4", styles.callout)}>
            <div className="flex items-start gap-3">
              <Megaphone className={cn("mt-0.5 h-5 w-5 shrink-0", styles.icon)} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h3 className={cn("text-sm font-semibold md:text-base", styles.title)}>{announcement.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{announcement.message}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
