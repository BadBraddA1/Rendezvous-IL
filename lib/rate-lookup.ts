export interface RateRow {
  name: string
  amount: string
}

/** Prefer exact name match, then shortest name that contains the pattern. */
export function findRateAmount(
  rates: Record<string, RateRow[]> | undefined,
  category: string,
  namePattern: string,
): number {
  if (!rates?.[category]?.length) return 0

  const list = rates[category]
  const exact = list.find((rate) => rate.name === namePattern)
  if (exact) return parseFloat(exact.amount) || 0

  const partialMatches = list
    .filter((rate) => rate.name.includes(namePattern))
    .sort((a, b) => a.name.length - b.name.length)

  const match = partialMatches[0]
  return match ? parseFloat(match.amount) || 0 : 0
}

export function createRateGetter(rates: Record<string, RateRow[]> | undefined) {
  return (category: string, namePattern: string) =>
    findRateAmount(rates, category, namePattern)
}

export function packageTypeLabel(
  packageType: "regular" | "special_3_9" | "special_2_6" | "special_1_3",
): string {
  switch (packageType) {
    case "special_3_9":
      return "3/9 package"
    case "special_2_6":
      return "2/6 package"
    case "special_1_3":
      return "1/3 package"
    default:
      return "Regular 4/12"
  }
}

export function driveInEntryDays(meals: Record<string, string[]>): number {
  const daysWithMeals = Object.entries(meals).filter(([, dayMeals]) => dayMeals.length > 0).length
  return daysWithMeals > 0 ? daysWithMeals : 5
}
