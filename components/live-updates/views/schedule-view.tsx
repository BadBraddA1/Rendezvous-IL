"use client"

import { Bed, ChevronRight, Clock, MapPin } from "lucide-react"
import { LuNowDot } from "@/components/live-updates/lu-now-dot"
import { getEventIcon } from "@/components/live-updates/event-icon"
import { useFitVisibleCount } from "@/components/live-updates/fit-list"
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
  const restOfToday = (upcomingToday ?? []).filter((row) => {
    if (!item) return true
    return !(row.date === item.date && row.time === item.time && row.title === item.title)
  })

  const { listRef, probeRef, visibleCount, hiddenCount } = useFitVisibleCount({
    itemCount: restOfToday.length,
    columns: 1,
    gapPx: 10,
    footerReservePx: 32,
  })
  const visibleRest = restOfToday.slice(0, visibleCount)
  const probe = restOfToday[0]

  return (
    <div className="relative flex h-full min-h-0 w-full items-stretch justify-center">
      <div className="relative grid h-full min-h-0 w-full max-w-[96rem] gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-5">
        <div className="lu-panel relative flex min-h-0 flex-col justify-center overflow-hidden p-8 text-center sm:p-10">
          {item ? (
            <div className="relative min-h-0">
              <div className="mb-6 flex items-center justify-center gap-4">
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

              <div className="mb-6 flex justify-center">
                {getEventIcon(item.title, item.isMeal, "lg")}
              </div>

              <h2 className="lu-type-feature mb-4 line-clamp-3">{item.title}</h2>

              <p className="lu-type-board-lg lu-text-body mb-3">
                {!showNow && item === nextItem ? `${item.day} ` : ""}
                {item.time}
              </p>

              {item.location && (
                <p className="lu-type-board-md lu-text-muted mt-4 flex items-center justify-center gap-3">
                  <MapPin className="text-primary h-8 w-8 shrink-0" aria-hidden="true" />
                  <span className="line-clamp-2">{item.location}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="relative">
              <Bed className="lu-icon-muted mx-auto mb-6 h-28 w-28" aria-hidden="true" />
              <h2 className="lu-type-board-xl lu-text-muted">No Scheduled Events</h2>
              <p className="lu-type-board-md lu-text-subtle mt-4">Enjoy your free time!</p>
            </div>
          )}
        </div>

        <div className="lu-panel relative flex min-h-0 flex-col overflow-hidden p-5 sm:p-6">
          <div className="mb-3 flex shrink-0 items-center gap-3">
            <span className="lu-type-label lu-text-schedule">Rest of today</span>
            <span className="lu-text-secondary text-sm tabular-nums">
              {restOfToday.length > 0
                ? hiddenCount > 0
                  ? `${visibleCount}/${restOfToday.length}`
                  : `${restOfToday.length}`
                : ""}
            </span>
          </div>

          {restOfToday.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <p className="lu-type-board-sm lu-text-muted">Nothing else on the board today</p>
            </div>
          ) : (
            <>
              <div
                ref={probeRef}
                aria-hidden="true"
                className="pointer-events-none invisible absolute left-0 top-0 -z-10 w-full"
              >
                {probe ? <RestRow row={probe} /> : null}
              </div>
              <div
                ref={listRef}
                className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden"
              >
                {visibleRest.map((row, idx) => (
                  <RestRow key={`${row.date}-${row.time}-${row.title}-${idx}`} row={row} />
                ))}
              </div>
              {hiddenCount > 0 && (
                <p className="lu-type-label lu-text-schedule mt-2 shrink-0 text-center">
                  +{hiddenCount} more later
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function RestRow({ row }: { row: ScheduleItem }) {
  return (
    <div className="lu-panel-inner flex items-start gap-3 px-3.5 py-3">
      <div className="shrink-0 pt-0.5">{getEventIcon(row.title, row.isMeal, "sm")}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[length:var(--lu-type-board-sm)] font-bold leading-snug text-white">
          {row.title}
        </p>
        <p className="lu-text-secondary mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-base font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="lu-text-schedule h-4 w-4" aria-hidden="true" />
            {row.time}
          </span>
          {row.location && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="lu-text-schedule h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{row.location}</span>
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
