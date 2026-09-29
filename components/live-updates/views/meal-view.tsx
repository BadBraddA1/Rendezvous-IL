"use client"

import { Clock, MapPin, UtensilsCrossed } from "lucide-react"
import { getEventIcon } from "@/components/live-updates/event-icon"
import type { MealData, ScheduleItem } from "@/lib/live-updates/types"

export function MealView({
  nextMeal,
  mealData,
  followingMeal,
}: {
  nextMeal: ScheduleItem | null
  mealData: MealData | null
  followingMeal?: ScheduleItem | null
}) {
  const mealLabel = "Next Meal"

  const stripDietaryTags = (s: string) =>
    s
      .replace(
        /\s*\(\s*(?:GF|DF|V|VG|VEGAN|VEGETARIAN|N|NF|SF|EF)(?:\s*[,/&]\s*(?:GF|DF|V|VG|VEGAN|VEGETARIAN|N|NF|SF|EF))*\s*\)/gi,
        "",
      )
      .replace(/\s+/g, " ")
      .trim()

  const cleanMain = mealData?.main_dish ? stripDietaryTags(mealData.main_dish) : ""
  const cleanSides =
    mealData?.sides && mealData.sides.length > 0
      ? mealData.sides.map(stripDietaryTags).filter(Boolean)
      : []
  const hasMenu = !!cleanMain || cleanSides.length > 0

  return (
    <div className="relative flex h-full w-full select-none items-center justify-center">
      <div className="lu-panel relative w-full max-w-6xl p-10 text-center sm:p-12">
        {!nextMeal ? (
          <div className="relative flex flex-col items-center">
            <UtensilsCrossed className="lu-icon-muted mb-6 h-32 w-32" aria-hidden="true" />
            <h2 className="lu-type-board-xl lu-text-muted">No Upcoming Meals</h2>
          </div>
        ) : (
          <div className="relative flex flex-col items-center">
            <div className="lu-pin-warm-border lu-priority-normal-surface mb-8 inline-flex items-center gap-3 rounded-full border px-5 py-2">
              {getEventIcon(nextMeal.title, true, "sm")}
              <span className="lu-type-label-lg lu-text-meal opacity-90">
                {mealLabel} · {nextMeal.title}
              </span>
            </div>

            {hasMenu ? (
              <div className="mb-8 max-w-5xl">
                {cleanMain && <p className="lu-type-menu-main text-balance">{cleanMain}</p>}
                {cleanSides.length > 0 && (
                  <p
                    className={
                      cleanMain
                        ? "lu-type-menu-side lu-text-secondary mt-6 text-balance"
                        : "lu-type-board-xl font-semibold text-balance"
                    }
                  >
                    {cleanMain && <span className="lu-text-meal mr-2 opacity-70">with</span>}
                    {cleanSides.join(", ")}
                  </p>
                )}
              </div>
            ) : (
              <p className="lu-type-board-lg lu-text-subtle mb-8">Menu coming soon</p>
            )}

            <div className="lu-text-muted flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              <p className="lu-type-board-md flex items-center gap-3">
                <Clock className="lu-text-meal h-8 w-8 opacity-70" aria-hidden="true" />
                Served at {nextMeal.time}
              </p>
              {nextMeal.location && (
                <p className="lu-type-board-md flex items-center gap-3">
                  <MapPin className="lu-text-meal h-8 w-8 opacity-70" aria-hidden="true" />
                  {nextMeal.location}
                </p>
              )}
            </div>

            {followingMeal && (
              <p className="lu-type-board-sm lu-text-secondary mt-10 border-t border-white/10 pt-6">
                Then · {followingMeal.title} at {followingMeal.time}
                {followingMeal.day !== nextMeal.day ? ` (${followingMeal.day})` : ""}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
