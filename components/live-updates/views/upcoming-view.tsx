"use client"

import { Bed, Calendar, Clock, MapPin } from "lucide-react"
import { LU_ICON } from "@/lib/live-updates-colors"
import { LuNowDot } from "@/components/live-updates/lu-now-dot"
import { getEventIcon } from "@/components/live-updates/event-icon"
import type { ScheduleItem } from "@/lib/live-updates/types"

const MAX_ROWS = 8

export function UpcomingView({
  nowItem,
  upcomingToday,
  upcomingAll,
}: {
  nowItem: ScheduleItem | null
  upcomingToday: ScheduleItem[]
  upcomingAll: ScheduleItem[]
}) {
  const upcoming = upcomingToday.length > 0 ? upcomingToday : upcomingAll
  const events: { item: ScheduleItem; isNow: boolean }[] = []
  const usingToday = upcomingToday.length > 0

  if (nowItem) {
    events.push({ item: nowItem, isNow: true })
  }
  for (const item of upcoming) {
    if (events.length >= MAX_ROWS) break
    if (
      nowItem &&
      item.title === nowItem.title &&
      item.time === nowItem.time &&
      item.date === nowItem.date
    ) {
      continue
    }
    events.push({ item, isNow: false })
  }

  return (
    <div className="relative flex h-full w-full select-none items-center justify-center">
      <div className="lu-panel relative w-full max-w-6xl p-8 sm:p-10">
        <div className="relative">
          <div className="mb-7 flex items-center justify-center gap-4">
            <div className="lu-pin-lake-surface lu-pin-lake-border rounded-2xl border p-4">
              <Calendar className="lu-text-schedule h-10 w-10" aria-hidden="true" />
            </div>
            <div className="text-center sm:text-left">
              <h2 className="lu-type-board-xl font-bold">
                {usingToday ? "Today’s agenda" : "Up Next"}
              </h2>
              <p className="lu-type-label lu-text-schedule mt-1 opacity-80">
                {usingToday ? "Rest of the day" : "Coming up"}
              </p>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="py-12 text-center">
              <Bed className="lu-icon-muted mx-auto mb-6 h-24 w-24" aria-hidden="true" />
              <p className="lu-type-board-lg lu-text-muted">No upcoming events</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(({ item, isNow }, idx) => (
                <div
                  key={`${item.date}-${item.time}-${item.title}-${idx}`}
                  className={`flex items-center gap-5 rounded-xl border px-5 py-4 transition-colors ${
                    isNow
                      ? "lu-surface-now lu-border-now border"
                      : "border-white/20 bg-white/[0.06]"
                  }`}
                >
                  <div className="shrink-0">
                    {getEventIcon(
                      item.title,
                      item.isMeal,
                      "md",
                      isNow ? LU_ICON.now : LU_ICON.schedule,
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-3">
                      {isNow && (
                        <span className="lu-surface-now lu-border-now inline-flex items-center gap-2 rounded-full border px-3 py-1">
                          <LuNowDot size="md" />
                          <span className="lu-type-label-sm lu-text-now">Now</span>
                        </span>
                      )}
                    </div>
                    <h3 className="lu-type-board-md leading-tight text-balance">{item.title}</h3>
                    <div className="lu-type-board-sm lu-text-secondary mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1">
                      <span className="flex items-center gap-2">
                        <Clock className="lu-text-schedule h-5 w-5 opacity-70" aria-hidden="true" />
                        {item.day} {item.time}
                      </span>
                      {item.location && (
                        <span className="flex items-center gap-2">
                          <MapPin className="lu-text-schedule h-5 w-5 opacity-70" aria-hidden="true" />
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
