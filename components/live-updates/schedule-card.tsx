import { Calendar } from "lucide-react"
import { LuNowDot } from "@/components/live-updates/lu-now-dot"
import { getEventIcon } from "@/components/live-updates/event-icon"
import type { ScheduleItem } from "@/lib/live-updates/types"

export function ScheduleCard({
  nowItem,
  nextItem,
  upcomingToday,
  upcomingAll,
}: {
  nowItem: ScheduleItem | null
  nextItem: ScheduleItem | null
  upcomingToday: ScheduleItem[]
  upcomingAll: ScheduleItem[]
}) {
  const eventsToShow: { item: ScheduleItem; isNow: boolean }[] = []

  if (nowItem) {
    eventsToShow.push({ item: nowItem, isNow: true })
  }

  const upcoming = upcomingToday.length > 0 ? upcomingToday : upcomingAll

  for (const item of upcoming) {
    if (eventsToShow.length >= 5) break
    if (!eventsToShow.some((e) => e.item === item)) {
      eventsToShow.push({ item, isNow: false })
    }
  }

  return (
    <div className="group relative overflow-hidden lu-panel p-7">
      <div className="relative">
          <div className="mb-6 flex items-center gap-3">
          <div className="lu-pin-lake-surface lu-pin-lake-border rounded-xl border-2 p-2.5">
            <Calendar className="lu-text-schedule h-5 w-5" />
          </div>
          <span className="lu-type-label lu-text-schedule">Schedule</span>
        </div>
        <div className="space-y-2.5">
          {eventsToShow.length > 0 ? (
            eventsToShow.map(({ item, isNow }, index) => (
              <div
                key={index}
                className={`rounded-xl border-2 p-3.5 transition-colors ${
                  isNow
                    ? "lu-surface-now lu-border-now"
                    : item === nextItem
                      ? "border-white/45 bg-[#243036]"
                      : "border-white/35 bg-[#1a2428]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    {isNow && <LuNowDot />}
                    {getEventIcon(item.title, item.isMeal, "xs")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base leading-tight truncate">{item.title}</p>
                    <p
                      className={`text-sm mt-0.5 ${isNow ? "lu-text-now lu-type-label-sm" : "lu-text-muted"}`}
                    >
                      {isNow ? "Now" : `${item.day} ${item.time}`}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="lu-text-muted text-sm">No upcoming events</p>
          )}
        </div>
      </div>
    </div>
  )
}
