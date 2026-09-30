"use client"

import { useEffect, useState } from "react"
import { Bed, Calendar, Clock, MapPin } from "lucide-react"
import { LU_ICON } from "@/lib/live-updates-colors"
import { LuNowDot } from "@/components/live-updates/lu-now-dot"
import { getEventIcon } from "@/components/live-updates/event-icon"
import { useFitVisibleCount } from "@/components/live-updates/fit-list"
import type { ScheduleItem } from "@/lib/live-updates/types"

const MAX_CANDIDATES = 16

function useAgendaColumns() {
  const [columns, setColumns] = useState(1)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1100px)")
    const sync = () => setColumns(mq.matches ? 2 : 1)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])
  return columns
}

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
  const usingToday = upcomingToday.length > 0
  const columns = useAgendaColumns()

  const events: { item: ScheduleItem; isNow: boolean }[] = []
  if (nowItem) {
    events.push({ item: nowItem, isNow: true })
  }
  for (const item of upcoming) {
    if (events.length >= MAX_CANDIDATES) break
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

  const { listRef, probeRef, visibleCount, hiddenCount } = useFitVisibleCount({
    itemCount: events.length,
    columns,
    gapPx: 10,
    footerReservePx: 40,
  })

  const visible = events.slice(0, visibleCount)
  const probe = events[0]

  return (
    <div className="relative flex h-full min-h-0 w-full select-none items-stretch justify-center">
      <div className="lu-panel relative flex h-full min-h-0 w-full max-w-[96rem] flex-col p-5 sm:p-7">
        <div className="mb-4 flex shrink-0 items-center justify-center gap-3 sm:mb-5 sm:gap-4">
          <div className="lu-pin-lake-surface lu-pin-lake-border rounded-xl border-2 p-3">
            <Calendar className="lu-text-schedule h-8 w-8" aria-hidden="true" />
          </div>
          <div className="text-center sm:text-left">
            <h2 className="lu-type-board-lg font-bold sm:text-[length:var(--lu-type-board-xl)]">
              {usingToday ? "Today’s agenda" : "Up Next"}
            </h2>
            <p className="lu-type-label lu-text-schedule mt-0.5">
              {usingToday ? "Rest of the day" : "Coming up"}
              {hiddenCount > 0 ? ` · showing ${visibleCount} of ${events.length}` : ""}
            </p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <Bed className="lu-icon-muted mb-6 h-24 w-24" aria-hidden="true" />
            <p className="lu-type-board-lg lu-text-muted">No upcoming events</p>
          </div>
        ) : (
          <>
            {/* Off-layout probe row — same chrome as real rows for height measure */}
            <div
              ref={probeRef}
              aria-hidden="true"
              className="pointer-events-none invisible absolute left-0 top-0 -z-10 w-full max-w-full px-0"
            >
              {probe ? <AgendaRow item={probe.item} isNow={probe.isNow} /> : null}
            </div>

            <div
              ref={listRef}
              className={`grid min-h-0 flex-1 content-start gap-2.5 overflow-hidden ${
                columns > 1 ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {visible.map(({ item, isNow }, idx) => (
                <AgendaRow
                  key={`${item.date}-${item.time}-${item.title}-${idx}`}
                  item={item}
                  isNow={isNow}
                />
              ))}
            </div>

            {hiddenCount > 0 && (
              <p className="lu-type-label lu-text-schedule mt-3 shrink-0 text-center">
                +{hiddenCount} more later today
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function AgendaRow({ item, isNow }: { item: ScheduleItem; isNow: boolean }) {
  return (
    <div
      className={`flex min-h-0 items-center gap-3 rounded-xl border-2 px-4 py-3 sm:gap-4 sm:px-5 ${
        isNow ? "lu-surface-now lu-border-now" : "border-white/45 bg-[#243036]"
      }`}
    >
      <div className="shrink-0">
        {getEventIcon(item.title, item.isMeal, "sm", isNow ? LU_ICON.now : LU_ICON.schedule)}
      </div>
      <div className="min-w-0 flex-1">
        {isNow && (
          <div className="mb-1">
            <span className="lu-surface-now lu-border-now inline-flex items-center gap-2 rounded-full border-2 px-2.5 py-0.5">
              <LuNowDot size="md" />
              <span className="lu-type-label-sm lu-text-now">Now</span>
            </span>
          </div>
        )}
        <h3 className="truncate text-[length:var(--lu-type-board-sm)] font-bold leading-snug text-white sm:text-[length:var(--lu-type-board-md)]">
          {item.title}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-base font-semibold text-[#e2eeea] sm:text-lg">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="lu-text-schedule h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="tabular-nums">
              {item.day} {item.time}
            </span>
          </span>
          {item.location && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="lu-text-schedule h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.location}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
