import type { MemberAttendance } from "@/lib/calculator-schedule"
import {
  fullWeekAttendance,
  inferLodgingNightsFromMeals,
  LODGING_NIGHTS,
} from "@/lib/calculator-schedule"
import type { LodgingType } from "@/lib/admin-calculator-cost"

/** DB `family_members` meal columns → calculator day/meal slots. */
export const REGISTRATION_MEAL_COLUMNS = [
  { column: "monday_dinner", day: "mon", meal: "dinner" },
  { column: "tuesday_breakfast", day: "tue", meal: "breakfast" },
  { column: "tuesday_lunch", day: "tue", meal: "lunch" },
  { column: "tuesday_dinner", day: "tue", meal: "dinner" },
  { column: "wednesday_breakfast", day: "wed", meal: "breakfast" },
  { column: "wednesday_lunch", day: "wed", meal: "lunch" },
  { column: "wednesday_dinner", day: "wed", meal: "dinner" },
  { column: "thursday_breakfast", day: "thu", meal: "breakfast" },
  { column: "thursday_lunch", day: "thu", meal: "lunch" },
  { column: "thursday_dinner", day: "thu", meal: "dinner" },
  { column: "friday_breakfast", day: "fri", meal: "breakfast" },
  { column: "friday_lunch", day: "fri", meal: "lunch" },
] as const

export type RegistrationMemberRow = Record<string, unknown>

export function isTruthyFlag(value: unknown): boolean {
  return value === 1 || value === true || value === "1"
}

/** Map registration `lodging_type` values to calculator lodging categories. */
export function normalizeRegistrationLodgingType(raw: string | null | undefined): LodgingType {
  const lower = String(raw ?? "").toLowerCase()
  if (lower.includes("drive")) return "drivein"
  if (lower === "rv") return "rv"
  if (lower === "tent") return "tent"
  return "motel"
}

export function ageAtEventDate(
  dateOfBirth: string | null | undefined,
  storedAge: number | null | undefined,
  eventYear: number,
  sourceYear?: number,
): number {
  if (dateOfBirth) {
    const dob = new Date(dateOfBirth)
    if (!Number.isNaN(dob.getTime())) {
      const eventDate = new Date(`${eventYear}-07-01`)
      let age = eventDate.getFullYear() - dob.getFullYear()
      const monthDiff = eventDate.getMonth() - dob.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && eventDate.getDate() < dob.getDate())) {
        age--
      }
      return Math.max(0, age)
    }
  }

  if (storedAge != null && Number.isFinite(storedAge)) {
    const yearsForward = sourceYear != null ? Math.max(0, eventYear - sourceYear) : 0
    return Math.max(0, Number(storedAge) + yearsForward)
  }

  return 18
}

const ADULT_MIN_AGE = 18

/**
 * When seeding the public calculator from a prior registration, keep adults at their
 * prior-year age (same bracket, cleaner display). Youth and children still age forward.
 */
export function ageForCalculatorFromPriorRegistration(
  dateOfBirth: string | null | undefined,
  storedAge: number | null | undefined,
  targetYear: number,
  sourceYear: number,
): number {
  const priorAge = ageAtEventDate(dateOfBirth, storedAge, sourceYear)
  if (priorAge >= ADULT_MIN_AGE) {
    return priorAge
  }
  return ageAtEventDate(dateOfBirth, storedAge, targetYear, sourceYear)
}

export function registrationMemberToAttendance(row: RegistrationMemberRow): MemberAttendance {
  const meals: Record<string, string[]> = {}

  for (const { column, day, meal } of REGISTRATION_MEAL_COLUMNS) {
    if (isTruthyFlag(row[column])) {
      if (!meals[day]) meals[day] = []
      meals[day].push(meal)
    }
  }

  const mealSlots = Object.values(meals).reduce((sum, list) => sum + list.length, 0)
  if (mealSlots === 0) {
    return fullWeekAttendance()
  }

  const nights = inferLodgingNightsFromMeals(meals)
  return {
    attending: true,
    nights,
    meals,
  }
}

export function siteNightsFromAttendance(
  attendance: Record<string, MemberAttendance>,
  memberIds: string[],
): number {
  let maxNights = 0
  for (const id of memberIds) {
    const att = attendance[id]
    if (!att?.attending) continue
    maxNights = Math.max(maxNights, att.nights.length)
  }
  if (maxNights === 0) return LODGING_NIGHTS.length
  return Math.min(LODGING_NIGHTS.length, Math.max(1, maxNights))
}

export function registrationPaidTotal(row: Record<string, unknown>): number {
  if (row.total_cost != null && Number(row.total_cost) > 0) {
    return Number(row.total_cost)
  }

  return (
    Number(row.lodging_total ?? 0) +
    Number(row.tshirt_total ?? 0) +
    Number(row.climbing_tower_total ?? 0) +
    Number(row.registration_fee ?? 0) +
    Number(row.scholarship_donation ?? 0)
  )
}

function normalizePersonName(first: unknown, last?: unknown): string {
  return `${String(first ?? "").trim().toLowerCase()}|${String(last ?? "").trim().toLowerCase()}`
}

export function matchRegistrationMember(
  firstName: string,
  lastName: string,
  registrationMembers: RegistrationMemberRow[],
): RegistrationMemberRow | undefined {
  const key = normalizePersonName(firstName, lastName)
  return registrationMembers.find(
    (row) => normalizePersonName(row.first_name, row.last_name) === key,
  )
}
