import { isPayingAttendeeAge, motelOccupancyFromPayingCount } from "@/lib/motel-occupancy"
import {
  computeRegularMealDeductions,
  countSelectedMeals,
} from "@/lib/calculator-meals"
import type { MemberAttendance } from "@/lib/calculator-schedule"
import { createRateGetter, driveInEntryDays, type RateRow } from "@/lib/rate-lookup"

export type { MemberAttendance }

export type LodgingType = "motel" | "rv" | "tent" | "drivein"
export type PackageType = "regular" | "special_3_9" | "special_2_6" | "special_1_3"
export type AgeGroup = "adult" | "youth" | "child" | "infant"

export interface CalculatorMember {
  id: string
  name: string
  age: number
}

export function getAgeGroup(age: number): AgeGroup {
  if (age >= 18) return "adult"
  if (age >= 12) return "youth"
  if (age >= 6) return "child"
  return "infant"
}

/** Package type for one person's nights + meals (not family-wide). */
export function detectMemberPackageType(att: MemberAttendance): PackageType {
  const nightCount = att.nights.length
  const mealCount = countSelectedMeals(att.meals)

  if (nightCount === 3 && mealCount === 9) return "special_3_9"
  if (nightCount === 2 && mealCount === 6) return "special_2_6"
  if (nightCount === 1 && mealCount === 3) return "special_1_3"
  return "regular"
}

export interface MemberCostLine {
  member: CalculatorMember
  ageGroup: AgeGroup
  packageType: PackageType
  baseCost: number
  deductions: number
  additions: number
  total: number
}

export interface AdminCalculatorCost {
  members: MemberCostLine[]
  lodging: number
  siteFee: number
  siteNightRate: number
  deductions: number
  additions: number
  total: number
  payingAttendeeCount: number
  motelAdultUnit: number
}

export function computeAdminCalculatorCost(input: {
  members: CalculatorMember[]
  attendance: Record<string, MemberAttendance>
  lodgingType: LodgingType
  numNights: number
  rates: Record<string, RateRow[]> | undefined
}): AdminCalculatorCost {
  const empty: AdminCalculatorCost = {
    members: [],
    lodging: 0,
    siteFee: 0,
    siteNightRate: 0,
    deductions: 0,
    additions: 0,
    total: 0,
    payingAttendeeCount: 0,
    motelAdultUnit: 0,
  }

  if (!input.rates) return empty

  const getRate = createRateGetter(input.rates)
  const attendingMembers = input.members.filter((member) => input.attendance[member.id]?.attending)
  const payingAttendeeCount = attendingMembers.filter((member) =>
    isPayingAttendeeAge(member.age),
  ).length
  const occupancyType = motelOccupancyFromPayingCount(payingAttendeeCount)

  const motelAdultUnit =
    input.lodgingType === "motel"
      ? getRate(input.lodgingType, `motel_${occupancyType}_adult`)
      : 0

  const memberCosts: MemberCostLine[] = attendingMembers.map((member) => {
    const att = input.attendance[member.id]
    const ageGroup = getAgeGroup(member.age)
    const packageType = detectMemberPackageType(att)
    const rateCategory = packageType === "regular" ? input.lodgingType : packageType
    let baseCost = 0
    let deductions = 0
    let additions = 0
    const isInfant = !isPayingAttendeeAge(member.age)

    if (!isInfant) {
      if (input.lodgingType === "motel") {
        if (ageGroup === "adult") {
          baseCost = getRate(rateCategory, `motel_${occupancyType}_adult`)
        } else {
          baseCost = getRate(rateCategory, `motel_${ageGroup}`)
        }
      } else if (input.lodgingType === "rv") {
        baseCost = getRate(rateCategory, `rv_${ageGroup}`)
      } else if (input.lodgingType === "tent") {
        baseCost = getRate(rateCategory, `tent_${ageGroup}`)
      } else if (input.lodgingType === "drivein") {
        const entryDays = driveInEntryDays(att.meals)
        baseCost = getRate("drivein", `drivein_${ageGroup}`) * entryDays
      }

      // Regular 4/12: deduct every standard meal this person is not taking
      if (packageType === "regular" && input.lodgingType !== "drivein") {
        deductions = computeRegularMealDeductions(att.meals, ageGroup, getRate)
      }

      if (input.lodgingType === "drivein") {
        Object.values(att.meals).forEach((meals) => {
          meals.forEach((meal) => {
            additions += getRate("meal_addition", `${meal}_${ageGroup}`)
          })
        })
      }
    }

    return {
      member,
      ageGroup,
      packageType,
      baseCost,
      deductions,
      additions,
      total: baseCost - deductions + additions,
    }
  })

  let siteFee = 0
  let siteNightRate = 0
  if (input.lodgingType === "rv") {
    siteNightRate = getRate("rv", "rv_site_night")
    siteFee = siteNightRate * input.numNights
  } else if (input.lodgingType === "tent") {
    siteNightRate = getRate("tent", "tent_site_night")
    siteFee = siteNightRate * input.numNights
  }

  const lodging = memberCosts.reduce((sum, line) => sum + line.baseCost, 0)
  const deductions = memberCosts.reduce((sum, line) => sum + line.deductions, 0)
  const additions = memberCosts.reduce((sum, line) => sum + line.additions, 0)

  return {
    members: memberCosts,
    lodging,
    siteFee,
    siteNightRate,
    deductions,
    additions,
    total: lodging - deductions + additions + siteFee,
    payingAttendeeCount,
    motelAdultUnit,
  }
}
