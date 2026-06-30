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
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-xl bg-primary/10 p-2.5 border border-primary/20">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <span className="lu-type-label text-primary/90">Schedule</span>
        </div>
        <div className="space-y-2.5">
          {eventsToShow.length > 0 ? (
            eventsToShow.map(({ item, isNow }, index) => (
              <div
                key={index}
                className={`p-3.5 rounded-xl border transition-colors ${
                  isNow
                    ? "lu-surface-now border lu-border-now"
                    : item === nextItem
                      ? "bg-white/[0.07] border-white/15"
                      : "bg-white/[0.03] border-white/5"
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
