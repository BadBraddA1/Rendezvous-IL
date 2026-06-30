"use client"

import { Calendar, Bed, Clock, MapPin, ChevronRight } from "lucide-react"
import { LU_ICON } from "@/lib/live-updates-colors"
import { LuNowDot } from "@/components/live-updates/lu-now-dot"
import { getEventIcon } from "@/components/live-updates/event-icon"
import type { ScheduleItem } from "@/lib/live-updates/types"

export function UpcomingView({
  nowItem,
  upcomingToday,
  upcomingAll,
}: {
  nowItem: ScheduleItem | null
  upcomingToday: ScheduleItem[]
  upcomingAll: ScheduleItem[]
}) {
  // Build a list of up to 3 upcoming events. If something is happening now,
  // include it as the first item with a "now" badge. Fill the rest from
  // upcomingToday (or upcomingAll if today is empty).
  const upcoming = upcomingToday.length > 0 ? upcomingToday : upcomingAll
  const events: { item: ScheduleItem; isNow: boolean }[] = []

  if (nowItem) {
    events.push({ item: nowItem, isNow: true })
  }
  for (const item of upcoming) {
    if (events.length >= 3) break
    // Skip if it's the same as nowItem (already added)
    if (nowItem && item.title === nowItem.title && item.time === nowItem.time && item.date === nowItem.date) continue
    events.push({ item, isNow: false })
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      <div className="relative w-full max-w-6xl lu-panel p-10">
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="rounded-2xl lu-pin-lake-surface p-4 border lu-pin-lake-border">
              <Calendar className="h-10 w-10 lu-text-schedule" />
            </div>
            <h2 className="lu-type-board-xl font-bold">Up Next</h2>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12">
              <Bed className="h-24 w-24 lu-icon-muted mx-auto mb-6" />
              <p className="lu-type-board-lg lu-text-muted">No upcoming events</p>
            </div>
          ) : (
            <div className="space-y-5">
              {events.map(({ item, isNow }, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-6 p-6 rounded-2xl border transition-colors ${
                    isNow
                      ? "lu-surface-now border lu-border-now"
                      : "bg-white/[0.03] border-white/10"
                  }`}
                >
                  {/* Icon */}
                  <div className="shrink-0">
                    {getEventIcon(item.title, item.isMeal, "lg", isNow ? LU_ICON.now : LU_ICON.schedule)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-2">
                      {isNow && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full lu-surface-now border lu-border-now">
                          <LuNowDot size="md" />
                          <span className="lu-type-label-sm lu-text-now">Now</span>
                        </span>
                      )}
                    </div>
                    <h3 className="lu-type-board-lg leading-tight text-balance mb-2">
                      {item.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 lu-type-board-sm lu-text-secondary">
                      <span className="flex items-center gap-2">
                        <Clock className="h-6 w-6 lu-text-schedule opacity-70" />
                        {item.day} {item.time}
                      </span>
                      {item.location && (
                        <span className="flex items-center gap-2">
                          <MapPin className="h-6 w-6 lu-text-schedule opacity-70" />
                          {item.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
