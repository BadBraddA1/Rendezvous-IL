import type { FamilyMember, LodgingType } from "@/types/registration"
import { motelOccupancyFromPayingCount } from "@/lib/motel-occupancy"
import { createRateGetter, type RateRow } from "@/lib/rate-lookup"

/** Full-week registration assumes Mon–Fri lodging (4 nights for RV/tent site fees). */
export const REGISTRATION_SITE_NIGHTS = 4

export type LodgingRatesByCategory = Record<string, RateRow[]>

export type LodgingCostResult = {
  total: number
  siteFee: number
  updatedMembers: FamilyMember[]
}

/** Legacy 2026 amounts — only used if a rate chart cannot be loaded. */
const LEGACY_FALLBACK = {
  motel: { single: 515, double: 350, triple: 315, quad: 300, youth: 235, child: 190 },
  rv: { adult: 155, youth: 155, child: 75, siteNight: 30 },
  tent: { adult: 155, youth: 155, child: 75, siteNight: 20 },
} as const

function lodgingCategory(lodgingType: LodgingType): "motel" | "rv" | "tent" {
  if (lodgingType.startsWith("motel")) return "motel"
  if (lodgingType === "rv") return "rv"
  return "tent"
}

function ageBucket(age: number): "adult" | "youth" | "child" | "infant" {
  if (age >= 18) return "adult"
  if (age >= 12) return "youth"
  if (age >= 6) return "child"
  return "infant"
}

/**
 * Lodging pricing for registration / express registration (full week, no meal
 * deductions). Prefer the event-year rate chart; fall back to legacy 2026
 * hardcoded amounts only when rates are unavailable.
 */
export function calculateLodgingCost(
  lodgingType: LodgingType,
  familyMembers: FamilyMember[],
  rates?: LodgingRatesByCategory | null,
): LodgingCostResult {
  const members = familyMembers.filter((m) => m.age >= 0)
  const payingCount = members.filter((m) => m.age >= 6).length
  const occupancy = motelOccupancyFromPayingCount(payingCount)
  const category = lodgingCategory(lodgingType)
  const getRate = rates ? createRateGetter(rates) : null

  const personRate = (age: number): number => {
    const bucket = ageBucket(age)
    if (bucket === "infant") return 0

    if (getRate) {
      if (category === "motel") {
        if (bucket === "adult") {
          return getRate("motel", `motel_${occupancy}_adult`)
        }
        return getRate("motel", `motel_${bucket}`)
      }
      return getRate(category, `${category}_${bucket}`)
    }

    // Legacy fallback
    if (category === "motel") {
      if (bucket === "child") return LEGACY_FALLBACK.motel.child
      if (bucket === "youth") return LEGACY_FALLBACK.motel.youth
      return LEGACY_FALLBACK.motel[occupancy]
    }
    const legacy = LEGACY_FALLBACK[category]
    if (bucket === "child") return legacy.child
    if (bucket === "youth") return legacy.youth
    return legacy.adult
  }

  let lodging = 0
  const updatedMembers = members.map((member) => {
    const cost = personRate(member.age)
    lodging += cost
    return { ...member, personCost: cost }
  })

  let siteFee = 0
  if (category === "rv" || category === "tent") {
    const siteNight = getRate
      ? getRate(category, `${category}_site_night`)
      : LEGACY_FALLBACK[category].siteNight
    siteFee = siteNight * REGISTRATION_SITE_NIGHTS
  }

  return {
    total: lodging + siteFee,
    siteFee,
    updatedMembers,
  }
}

/** Amounts for the lodging step pricing reference list. */
export function lodgingPriceReference(
  lodgingType: LodgingType,
  rates?: LodgingRatesByCategory | null,
): {
  single: number
  double: number
  triple: number
  quad: number
  youth: number
  child: number
  siteNight: number
  siteTotal: number
} {
  const category = lodgingCategory(lodgingType)
  const getRate = rates ? createRateGetter(rates) : null

  if (category === "motel") {
    return {
      single: getRate ? getRate("motel", "motel_single_adult") : LEGACY_FALLBACK.motel.single,
      double: getRate ? getRate("motel", "motel_double_adult") : LEGACY_FALLBACK.motel.double,
      triple: getRate ? getRate("motel", "motel_triple_adult") : LEGACY_FALLBACK.motel.triple,
      quad: getRate ? getRate("motel", "motel_quad_adult") : LEGACY_FALLBACK.motel.quad,
      youth: getRate ? getRate("motel", "motel_youth") : LEGACY_FALLBACK.motel.youth,
      child: getRate ? getRate("motel", "motel_child") : LEGACY_FALLBACK.motel.child,
      siteNight: 0,
      siteTotal: 0,
    }
  }

  const legacy = LEGACY_FALLBACK[category]
  const siteNight = getRate
    ? getRate(category, `${category}_site_night`)
    : legacy.siteNight
  return {
    single: 0,
    double: 0,
    triple: 0,
    quad: 0,
    youth: getRate ? getRate(category, `${category}_youth`) : legacy.youth,
    child: getRate ? getRate(category, `${category}_child`) : legacy.child,
    // "adult" line for rv/tent reference uses adult rate (ages 18+)
    siteNight,
    siteTotal: siteNight * REGISTRATION_SITE_NIGHTS,
  }
}

export function lodgingAdultRate(
  lodgingType: LodgingType,
  rates?: LodgingRatesByCategory | null,
): number {
  const category = lodgingCategory(lodgingType)
  const getRate = rates ? createRateGetter(rates) : null
  if (category === "motel") return 0
  if (getRate) return getRate(category, `${category}_adult`)
  return LEGACY_FALLBACK[category].adult
}
