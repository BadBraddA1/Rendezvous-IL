"use client"

import { Bed, ChevronRight, Clock, MapPin } from "lucide-react"
import { LuNowDot } from "@/components/live-updates/lu-now-dot"
import { getEventIcon } from "@/components/live-updates/event-icon"
import type { ScheduleItem } from "@/lib/live-updates/types"

export function ScheduleView({
  nowItem,
  nextItem,
  upcomingToday,
}: {
  nowItem: ScheduleItem | null
  nextItem: ScheduleItem | null
  upcomingToday?: ScheduleItem[]
}) {
  const showNow = !!nowItem
  const item = nowItem ?? nextItem
  const restOfToday = (upcomingToday ?? [])
    .filter((row) => {
      if (!item) return true
      return !(row.date === item.date && row.time === item.time && row.title === item.title)
    })
    .slice(0, 6)

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="relative grid w-full max-w-7xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="lu-panel relative flex flex-col justify-center p-10 text-center sm:p-12">
          {item ? (
            <div className="relative">
              <div className="mb-8 flex items-center justify-center gap-4">
                {showNow ? (
                  <>
                    <LuNowDot size="lg" />
                    <span className="lu-type-label-lg lu-text-now">Happening Now</span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="text-primary h-9 w-9" aria-hidden="true" />
                    <span className="lu-type-label-lg text-primary">Up Next</span>
                  </>
                )}
              </div>

              <div className="mb-8 flex justify-center">
                {getEventIcon(item.title, item.isMeal, "xl")}
              </div>

              <h2 className="lu-type-feature mb-6">{item.title}</h2>

              <p className="lu-type-board-lg lu-text-body mb-4">
                {!showNow && item === nextItem ? `${item.day} ` : ""}
                {item.time}
              </p>

              {item.location && (
                <p className="lu-type-board-md lu-text-muted mt-6 flex items-center justify-center gap-3">
                  <MapPin className="text-primary h-9 w-9" aria-hidden="true" />
                  {item.location}
                </p>
              )}
            </div>
          ) : (
            <div className="relative">
              <Bed className="lu-icon-muted mx-auto mb-6 h-32 w-32" aria-hidden="true" />
              <h2 className="lu-type-board-xl lu-text-muted">No Scheduled Events</h2>
              <p className="lu-type-board-md lu-text-subtle mt-4">Enjoy your free time!</p>
            </div>
          )}
        </div>

        <div className="lu-panel relative flex min-h-0 flex-col p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="lu-type-label lu-text-schedule">Rest of today</span>
            <span className="lu-text-subtle text-sm tabular-nums">
              {restOfToday.length > 0 ? `${restOfToday.length}` : ""}
            </span>
          </div>

          {restOfToday.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <p className="lu-type-board-sm lu-text-muted">Nothing else on the board today</p>
            </div>
          ) : (
            <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
              {restOfToday.map((row, idx) => (
                <li
                  key={`${row.date}-${row.time}-${row.title}-${idx}`}
                  className="lu-panel-inner flex items-start gap-4 px-4 py-3.5"
                >
                  <div className="shrink-0 pt-0.5">{getEventIcon(row.title, row.isMeal, "sm")}</div>
                  <div className="min-w-0 flex-1">
                    <p className="lu-type-board-sm leading-snug text-balance">{row.title}</p>
                    <p className="lu-text-secondary mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-base">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="lu-text-schedule h-4 w-4 " aria-hidden="true" />
                        {row.time}
                      </span>
                      {row.location && (
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <MapPin className="lu-text-schedule h-4 w-4 " aria-hidden="true" />
                          {row.location}
                        </span>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
