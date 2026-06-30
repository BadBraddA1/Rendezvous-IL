import { STANDARD_PACKAGE_MEALS } from "@/lib/calculator-meals"

export const LODGING_NIGHTS = ["mon", "tue", "wed", "thu"] as const
export type LodgingNight = (typeof LODGING_NIGHTS)[number]

export const SCHEDULE_DAYS = ["mon", "tue", "wed", "thu", "fri"] as const

/** Meals available per day in the event schedule. */
export const DAY_MEALS: Record<string, readonly string[]> = STANDARD_PACKAGE_MEALS

export const NIGHT_LABELS: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
}

export const NIGHT_LABELS_LONG: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
}

export const MEAL_LABELS: Record<string, string> = {
  breakfast: "B",
  lunch: "L",
  dinner: "D",
}

export const MEAL_LABELS_LONG: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
}

export type PackagePreset = "full" | "special_3_9" | "special_2_6" | "special_1_3" | "custom"

export interface MemberAttendance {
  attending: boolean
  nights: string[]
  meals: Record<string, string[]>
}

export const PACKAGE_PRESETS: {
  id: PackagePreset
  label: string
  description: string
}[] = [
  { id: "full", label: "Full week", description: "4 nights · 12 meals" },
  { id: "special_3_9", label: "3 / 9", description: "3 nights · 9 meals" },
  { id: "special_2_6", label: "2 / 6", description: "2 nights · 6 meals" },
  { id: "special_1_3", label: "1 / 3", description: "1 night · 3 meals" },
  { id: "custom", label: "Custom", description: "Pick nights & meals" },
]

function cloneMeals(meals: Record<string, string[]>): Record<string, string[]> {
  const next: Record<string, string[]> = {}
  for (const [day, list] of Object.entries(meals)) {
    next[day] = [...list]
  }
  return next
}

function mealsFromDays(days: Record<string, readonly string[]>): Record<string, string[]> {
  const meals: Record<string, string[]> = {}
  for (const [day, list] of Object.entries(days)) {
    meals[day] = [...list]
  }
  return meals
}

/** Full 4/12 — Mon–Thu lodging, standard meals Mon dinner through Fri lunch. */
export function fullWeekAttendance(): MemberAttendance {
  return {
    attending: true,
    nights: [...LODGING_NIGHTS],
    meals: mealsFromDays(STANDARD_PACKAGE_MEALS),
  }
}

const PRESET_ATTENDANCE: Record<Exclude<PackagePreset, "custom">, MemberAttendance> = {
  full: fullWeekAttendance(),
  special_3_9: {
    attending: true,
    nights: ["mon", "tue", "wed"],
    meals: mealsFromDays({
      mon: ["dinner"],
      tue: ["breakfast", "lunch", "dinner"],
      wed: ["breakfast", "lunch", "dinner"],
      thu: ["breakfast", "lunch", "dinner"],
    }),
  },
  special_2_6: {
    attending: true,
    nights: ["mon", "tue"],
    meals: mealsFromDays({
      mon: ["dinner"],
      tue: ["breakfast", "lunch", "dinner"],
      wed: ["breakfast", "lunch"],
    }),
  },
  special_1_3: {
    attending: true,
    nights: ["mon"],
    meals: mealsFromDays({
      mon: ["dinner"],
      tue: ["breakfast", "lunch"],
    }),
  },
}

export function attendanceFromPreset(
  preset: Exclude<PackagePreset, "custom">,
  current?: MemberAttendance,
): MemberAttendance {
  const base = PRESET_ATTENDANCE[preset]
  return {
    attending: current?.attending ?? true,
    nights: [...base.nights],
    meals: cloneMeals(base.meals),
  }
}

export function detectPreset(att: MemberAttendance): PackagePreset {
  for (const preset of ["full", "special_3_9", "special_2_6", "special_1_3"] as const) {
    const sample = PRESET_ATTENDANCE[preset]
    const nightsMatch =
      sample.nights.length === att.nights.length &&
      sample.nights.every((n) => att.nights.includes(n))
    if (!nightsMatch) continue

    const mealsMatch = SCHEDULE_DAYS.every((day) => {
      const expected = sample.meals[day] ?? []
      const actual = att.meals[day] ?? []
      return (
        expected.length === actual.length &&
        expected.every((meal) => actual.includes(meal))
      )
    })
    if (mealsMatch) return preset
  }
  return "custom"
}

export type PricingPackageType = "regular" | "special_3_9" | "special_2_6" | "special_1_3"

/** Map a detected preset to the rate category used for pricing. */
export function packageTypeFromPreset(preset: PackagePreset): PricingPackageType {
  switch (preset) {
    case "special_3_9":
      return "special_3_9"
    case "special_2_6":
      return "special_2_6"
    case "special_1_3":
      return "special_1_3"
    default:
      return "regular"
  }
}

export function presetDisplayLabel(preset: PackagePreset, att: MemberAttendance): string {
  if (preset === "custom") {
    return `Custom · ${att.nights.length} nights · ${countMeals(att.meals)} meals`
  }
  return PACKAGE_PRESETS.find((option) => option.id === preset)?.label ?? "Custom"
}

export function presetPricingNote(preset: PackagePreset): string {
  switch (preset) {
    case "full":
      return "Full week 4/12 package pricing"
    case "special_3_9":
    case "special_2_6":
    case "special_1_3":
      return "Matches a standard partial-week package"
    default:
      return "Full-week rate minus meals you are not taking"
  }
}

export function resolveMemberSchedule(att: MemberAttendance) {
  const preset = detectPreset(att)
  const meta = PACKAGE_PRESETS.find((option) => option.id === preset)
  return {
    preset,
    packageType: packageTypeFromPreset(preset),
    label: presetDisplayLabel(preset, att),
    description: preset === "custom" ? presetPricingNote(preset) : (meta?.description ?? ""),
    pricingNote: presetPricingNote(preset),
  }
}

/** Toggle a lodging night and keep meals in sync (standard pattern per night). */
export function toggleLodgingNight(
  att: MemberAttendance,
  night: LodgingNight,
): MemberAttendance {
  const nights = att.nights.includes(night)
    ? att.nights.filter((n) => n !== night)
    : [...att.nights, night]

  const meals = cloneMeals(att.meals)
  if (!nights.includes(night)) {
    delete meals[night]
    const nightIndex = LODGING_NIGHTS.indexOf(night)
    const nextDay = LODGING_NIGHTS[nightIndex + 1]
    if (nextDay && meals[nextDay]) {
      meals[nextDay] = meals[nextDay].filter((m) => m !== "breakfast")
    }
  } else {
    const defaults = DAY_MEALS[night]
    meals[night] = defaults ? [...defaults] : []
  }

  return { ...att, nights, meals }
}

export function toggleMeal(
  att: MemberAttendance,
  day: string,
  meal: string,
): MemberAttendance {
  const dayMeals = att.meals[day] ?? []
  const nextDayMeals = dayMeals.includes(meal)
    ? dayMeals.filter((m) => m !== meal)
    : [...dayMeals, meal]

  return {
    ...att,
    meals: { ...att.meals, [day]: nextDayMeals },
  }
}

export function countMeals(meals: Record<string, string[]>): number {
  return Object.values(meals).reduce((sum, list) => sum + list.length, 0)
}

/** Infer Mon–Thu lodging nights from selected meals (registration import). */
export function inferLodgingNightsFromMeals(meals: Record<string, string[]>): string[] {
  const nights: string[] = []
  for (const night of LODGING_NIGHTS) {
    if (meals[night]?.includes("dinner")) {
      nights.push(night)
    }
  }
  return nights
}
