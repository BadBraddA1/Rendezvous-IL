import { isPayingAttendeeAge, motelOccupancyFromPayingCount } from "@/lib/motel-occupancy"
import { createRateGetter, driveInEntryDays, type RateRow } from "@/lib/rate-lookup"

export type LodgingType = "motel" | "rv" | "tent" | "drivein"
export type PackageType = "regular" | "special_3_9" | "special_2_6" | "special_1_3"
export type AgeGroup = "adult" | "youth" | "child" | "infant"

export interface CalculatorMember {
  id: string
  name: string
  age: number
}

export interface MemberAttendance {
  attending: boolean
  nights: string[]
  meals: Record<string, string[]>
}

export function getAgeGroup(age: number): AgeGroup {
  if (age >= 18) return "adult"
  if (age >= 12) return "youth"
  if (age >= 6) return "child"
  return "infant"
}

export function detectPackageType(
  memberAttendance: Record<string, MemberAttendance>,
): PackageType {
  const firstAttendance = Object.values(memberAttendance).find((a) => a.attending)
  if (!firstAttendance) return "regular"

  const nightCount = firstAttendance.nights.length
  const mealCount = Object.values(firstAttendance.meals).reduce(
    (sum, meals) => sum + meals.length,
    0,
  )

  if (nightCount === 3 && mealCount === 9) return "special_3_9"
  if (nightCount === 2 && mealCount === 6) return "special_2_6"
  if (nightCount === 1 && mealCount === 3) return "special_1_3"
  return "regular"
}

export interface MemberCostLine {
  member: CalculatorMember
  ageGroup: AgeGroup
  baseCost: number
  deductions: number
  additions: number
  total: number
}

export interface AdminCalculatorCost {
  packageType: PackageType
  members: MemberCostLine[]
  lodging: number
  siteFee: number
  siteNightRate: number
  deductions: number
  additions: number
  total: number
  packageApplied: PackageType | null
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
    packageType: "regular",
    members: [],
    lodging: 0,
    siteFee: 0,
    siteNightRate: 0,
    deductions: 0,
    additions: 0,
    total: 0,
    packageApplied: null,
    payingAttendeeCount: 0,
    motelAdultUnit: 0,
  }

  if (!input.rates) return empty

  const getRate = createRateGetter(input.rates)
  const packageType = detectPackageType(input.attendance)
  const attendingMembers = input.members.filter((member) => input.attendance[member.id]?.attending)
  const payingAttendeeCount = attendingMembers.filter((member) =>
    isPayingAttendeeAge(member.age),
  ).length
  const occupancyType = motelOccupancyFromPayingCount(payingAttendeeCount)
  const rateCategory = packageType === "regular" ? input.lodgingType : packageType

  const motelAdultUnit =
    input.lodgingType === "motel"
      ? getRate(rateCategory, `motel_${occupancyType}_adult`)
      : 0

  const memberCosts: MemberCostLine[] = attendingMembers.map((member) => {
    const att = input.attendance[member.id]
    const ageGroup = getAgeGroup(member.age)
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

      if (packageType === "regular" && input.lodgingType !== "drivein") {
        if (!att.nights.includes("mon") || !att.meals.mon?.includes("dinner")) {
          deductions += Math.abs(getRate("deduction", `monday_dinner_${ageGroup}`))
        }
        if (!att.meals.fri?.includes("breakfast")) {
          deductions += Math.abs(getRate("deduction", `friday_breakfast_${ageGroup}`))
        }
        if (!att.meals.fri?.includes("lunch")) {
          deductions += Math.abs(getRate("deduction", `friday_lunch_${ageGroup}`))
        }
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
    packageType,
    members: memberCosts,
    lodging,
    siteFee,
    siteNightRate,
    deductions,
    additions,
    total: lodging - deductions + additions + siteFee,
    packageApplied: packageType !== "regular" ? packageType : null,
    payingAttendeeCount,
    motelAdultUnit,
  }
}
