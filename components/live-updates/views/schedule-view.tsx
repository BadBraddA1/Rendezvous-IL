"use client"

import { ChevronRight, MapPin, Bed } from "lucide-react"
import { LuNowDot } from "@/components/live-updates/lu-now-dot"
import { getEventIcon } from "@/components/live-updates/event-icon"
import type { ScheduleItem } from "@/lib/live-updates/types"

export function ScheduleView({
  nowItem,
  nextItem,
}: {
  nowItem: ScheduleItem | null
  nextItem: ScheduleItem | null
}) {
  const showNow = !!nowItem
  const showNext = !nowItem && !!nextItem
  const item = nowItem ?? nextItem

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-full max-w-6xl lu-panel p-12 text-center">
        {item ? (
          <div className="relative">
            <div className="flex items-center justify-center gap-4 mb-10">
              {showNow ? (
                <>
                  <LuNowDot size="lg" />
                  <span className="lu-type-label-lg lu-text-now">Happening Now</span>
                </>
              ) : (
                <>
                  <ChevronRight className="h-9 w-9 text-primary" aria-hidden="true" />
                  <span className="lu-type-label-lg text-primary">Up Next</span>
                </>
              )}
            </div>

            <div className="flex justify-center mb-8">
              {getEventIcon(item.title, item.isMeal, "xl")}
            </div>

            <h2 className="lu-type-feature mb-6">{item.title}</h2>

            <p className="lu-type-board-lg lu-text-body mb-4">
              {showNext && item === nextItem ? `${item.day} ` : ""}
              {item.time}
            </p>

            {item.location && (
              <p className="lu-type-board-md lu-text-muted flex items-center justify-center gap-3 mt-6">
                <MapPin className="h-9 w-9 text-primary" aria-hidden="true" />
                {item.location}
              </p>
            )}
          </div>
        ) : (
          <div className="relative">
            <Bed className="h-32 w-32 lu-icon-muted mx-auto mb-6" aria-hidden="true" />
            <h2 className="lu-type-board-xl lu-text-muted">No Scheduled Events</h2>
            <p className="lu-type-board-md lu-text-subtle mt-4">Enjoy your free time!</p>
          </div>
        )}
      </div>
    </div>
  )
}
