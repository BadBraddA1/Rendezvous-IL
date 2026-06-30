"use client"

import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp, Utensils } from "lucide-react"
import { useScheduleData, type ScheduleMeal } from "@/components/schedule/schedule-data-context"
import { fetchJsonCached } from "@/lib/fetch-json-cache"

interface MealMenuProps {
  date: string // Format: YYYY-MM-DD
  mealType: "breakfast" | "lunch" | "dinner"
}

export function MealMenu({ date, mealType }: MealMenuProps) {
  const scheduleData = useScheduleData()
  const [meal, setMeal] = useState<ScheduleMeal | null>(
    () => scheduleData?.getMeal(date, mealType) ?? null,
  )
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(!scheduleData && meal === null)

  useEffect(() => {
    const cached = scheduleData?.getMeal(date, mealType)
    if (cached) {
      setMeal(cached)
      setIsLoading(false)
      return
    }

    if (scheduleData) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    void fetchJsonCached<{ meals?: ScheduleMeal[] }>(
      `/api/meals?date=${date}&mealType=${mealType}`,
    )
      .then((data) => {
        if (cancelled) return
        setMeal(data.meals?.[0] ?? null)
      })
      .catch(() => {
        if (!cancelled) setMeal(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [date, mealType, scheduleData])

  if (isLoading || !meal) {
    return null
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        aria-expanded={isExpanded}
      >
        <Utensils className="h-4 w-4" aria-hidden="true" />
        <span>View menu</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3 rounded-lg border border-primary/10 bg-primary/5 p-4 text-sm">
          <div>
            <span className="font-semibold text-foreground">Main:</span>{" "}
            <span className="text-muted-foreground">{meal.main_dish}</span>
          </div>

          {meal.sides && meal.sides.length > 0 && (
            <div>
              <span className="font-semibold text-foreground">Sides:</span>{" "}
              <span className="text-muted-foreground">{meal.sides.join(", ")}</span>
            </div>
          )}

          {meal.drinks && meal.drinks.length > 0 && (
            <div>
              <span className="font-semibold text-foreground">Drinks:</span>{" "}
              <span className="text-muted-foreground">{meal.drinks.join(", ")}</span>
            </div>
          )}

          {meal.notes && (
            <div className="border-t border-primary/10 pt-2 italic text-muted-foreground">{meal.notes}</div>
          )}
        </div>
      )}
    </div>
  )
}
