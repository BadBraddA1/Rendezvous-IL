/** Standard 4/12 package meals (Mon dinner through Fri lunch). */
export const STANDARD_PACKAGE_MEALS: Record<string, readonly string[]> = {
  mon: ["dinner"],
  tue: ["breakfast", "lunch", "dinner"],
  wed: ["breakfast", "lunch", "dinner"],
  thu: ["breakfast", "lunch", "dinner"],
  fri: ["breakfast", "lunch"],
} as const

const DAY_DEDUCTION_PREFIX: Record<string, string> = {
  mon: "monday",
  tue: "tuesday",
  wed: "wednesday",
  thu: "thursday",
  fri: "friday",
}

export function countSelectedMeals(meals: Record<string, string[]>): number {
  return Object.values(meals).reduce((sum, dayMeals) => sum + dayMeals.length, 0)
}

export function deductionRateName(day: string, meal: string, ageGroup: string): string {
  const dayPrefix = DAY_DEDUCTION_PREFIX[day]
  if (!dayPrefix) return ""
  return `${dayPrefix}_${meal}_${ageGroup}`
}

export function computeRegularMealDeductions(
  meals: Record<string, string[]>,
  ageGroup: string,
  getRate: (category: string, namePattern: string) => number,
): number {
  let total = 0

  for (const [day, expectedMeals] of Object.entries(STANDARD_PACKAGE_MEALS)) {
    const selected = meals[day] ?? []
    for (const meal of expectedMeals) {
      if (!selected.includes(meal)) {
        const name = deductionRateName(day, meal, ageGroup)
        if (name) {
          total += Math.abs(getRate("deduction", name))
        }
      }
    }
  }

  return total
}
