"use client"

import { UtensilsCrossed, Clock } from "lucide-react"
import { getEventIcon } from "@/components/live-updates/event-icon"
import type { MealData, ScheduleItem } from "@/lib/live-updates/types"

export function MealView({
  nextMeal,
  mealData,
}: {
  nextMeal: ScheduleItem | null
  mealData: MealData | null
}) {
  // Always use "Next Meal" as the leading label. Earlier versions tried to
  // be clever with "This Morning" / "Tonight" phrases, but those read wrong
  // when checked at the wrong time of day (e.g. seeing "This Morning ·
  // Breakfast" at 11 PM the night before). "Next Meal" is unambiguous in
  // every timeline scenario.
  const mealLabel = "Next Meal"

  // Strip dietary parentheticals like "(GF)", "(DF, GF)", "(V)", "(GF/DF)"
  // from any menu text. Per the kitchen team, those tags clutter the LU
  // display  -  anyone with dietary needs already has them on a printed sheet
  //  -  so we render clean dish names only.
  const stripDietaryTags = (s: string) =>
    s
      .replace(/\s*\(\s*(?:GF|DF|V|VG|VEGAN|VEGETARIAN|N|NF|SF|EF)(?:\s*[,/&]\s*(?:GF|DF|V|VG|VEGAN|VEGETARIAN|N|NF|SF|EF))*\s*\)/gi, "")
      .replace(/\s+/g, " ")
      .trim()

  const cleanMain = mealData?.main_dish ? stripDietaryTags(mealData.main_dish) : ""
  const cleanSides =
    mealData?.sides && mealData.sides.length > 0
      ? mealData.sides.map(stripDietaryTags).filter(Boolean)
      : []
  const hasMenu = !!cleanMain || cleanSides.length > 0

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      <div className="relative w-full max-w-6xl lu-panel p-12 text-center">
        {!nextMeal ? (
          <div className="relative flex flex-col items-center">
            <UtensilsCrossed className="h-32 w-32 lu-icon-muted mb-6" />
            <h2 className="lu-type-board-xl lu-text-muted">No Upcoming Meals</h2>
          </div>
        ) : (
          <div className="relative flex flex-col items-center">
            {/* Top: small label chip combining the time-of-day phrase and meal
                type ("Tonight • Dinner"). Intentionally small so the menu
                content below is the dominant element. */}
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border lu-pin-warm-border lu-priority-normal-surface mb-8">
              {getEventIcon(nextMeal.title, true, "sm")}
              <span className="lu-type-label-lg lu-text-meal opacity-90">
                {mealLabel} · {nextMeal.title}
              </span>
            </div>

            {/* Hero: the menu itself. Main dish at the top in the largest
                possible type; sides on a single line below at a step smaller
                so the visual hierarchy reads instantly from across the room. */}
            {hasMenu ? (
              <div className="mb-10 max-w-5xl">
                {cleanMain && (
                  <p className="lu-type-menu-main text-balance">
                    {cleanMain}
                  </p>
                )}
                {cleanSides.length > 0 && (
                  <p
                    className={
                      cleanMain
                        ? "mt-6 lu-type-menu-side lu-text-secondary text-balance"
                        : "lu-type-board-xl font-semibold text-balance"
                    }
                  >
                    {cleanMain && (
                      <span className="lu-text-meal opacity-70 mr-2">with</span>
                    )}
                    {cleanSides.join(", ")}
                  </p>
                )}
              </div>
            ) : (
              <p className="lu-type-board-lg lu-text-subtle mb-10">
                Menu coming soon
              </p>
            )}

            {/* Bottom: serving time, de-emphasized. */}
            <p className="lu-type-board-md lu-text-muted flex items-center justify-center gap-3">
              <Clock className="h-8 w-8 lu-text-meal opacity-70" aria-hidden="true" />
              Served at {nextMeal.time}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
