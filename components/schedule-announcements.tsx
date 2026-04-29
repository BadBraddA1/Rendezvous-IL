"use client"

import { useEffect, useState } from "react"
import { Megaphone } from "lucide-react"

interface Announcement {
  id: number
  title: string
  message: string
  priority: "low" | "normal" | "high" | "urgent"
  created_at: string
}

export function ScheduleAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const response = await fetch("/api/announcements/schedule")
        const data = await response.json()
        setAnnouncements(data.announcements || [])
      } catch (error) {
        console.error("Failed to fetch announcements:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncements()
    // Refresh every 30 seconds
    const interval = setInterval(fetchAnnouncements, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading || announcements.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {announcements.map((announcement) => (
        <div
          key={announcement.id}
          className={`rounded-xl border p-4 ${
            announcement.priority === "urgent"
              ? "border-red-500/50 bg-red-500/10"
              : announcement.priority === "high"
              ? "border-orange-500/50 bg-orange-500/10"
              : "border-amber-500/50 bg-amber-500/10"
          }`}
        >
          <div className="flex items-start gap-3">
            <Megaphone className={`h-5 w-5 mt-0.5 shrink-0 ${
              announcement.priority === "urgent"
                ? "text-red-500"
                : announcement.priority === "high"
                ? "text-orange-500"
                : "text-amber-500"
            }`} />
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-sm md:text-base ${
                announcement.priority === "urgent"
                  ? "text-red-500"
                  : announcement.priority === "high"
                  ? "text-orange-500"
                  : "text-amber-600"
              }`}>
                {announcement.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                {announcement.message}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
