"use client"

import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp, Utensils } from "lucide-react"

interface MealData {
  id: number
  date: string
  meal_type: string
  main_dish: string
  sides: string[] | null
  dessert: string | null
  drinks: string[] | null
  notes: string | null
  title: string | null
}

interface MealMenuProps {
  date: string // Format: YYYY-MM-DD
  mealType: "breakfast" | "lunch" | "dinner"
}

export function MealMenu({ date, mealType }: MealMenuProps) {
  const [meal, setMeal] = useState<MealData | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMeal = async () => {
      try {
        const res = await fetch(`/api/meals?date=${date}&mealType=${mealType}`)
        const data = await res.json()
        if (data.meals && data.meals.length > 0) {
          setMeal(data.meals[0])
        }
      } catch {
        // silently fail
      }
      setIsLoading(false)
    }
    fetchMeal()
  }, [date, mealType])

  if (isLoading || !meal) {
    return null
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <Utensils className="h-4 w-4" />
        <span>View Menu</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      
      {isExpanded && (
        <div className="mt-3 p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-3 text-sm">
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
          
          {meal.dessert && (
            <div>
              <span className="font-semibold text-foreground">Dessert:</span>{" "}
              <span className="text-muted-foreground">{meal.dessert}</span>
            </div>
          )}
          
          {meal.drinks && meal.drinks.length > 0 && (
            <div>
              <span className="font-semibold text-foreground">Drinks:</span>{" "}
              <span className="text-muted-foreground">{meal.drinks.join(", ")}</span>
            </div>
          )}
          
          {meal.notes && (
            <div className="pt-2 border-t border-primary/10 italic text-muted-foreground">
              {meal.notes}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
