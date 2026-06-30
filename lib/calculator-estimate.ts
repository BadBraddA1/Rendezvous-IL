import {
  computeAdminCalculatorCost,
  type AdminCalculatorCost,
  type CalculatorMember,
  type LodgingType,
} from "@/lib/admin-calculator-cost"
import { resolveMemberSchedule, type MemberAttendance } from "@/lib/calculator-schedule"
import { packageTypeLabel } from "@/lib/rate-lookup"
import type { RateRow } from "@/lib/rate-lookup"

export type CalculatorEstimateMemberLine = AdminCalculatorCost["members"][number] & {
  schedulePreset: ReturnType<typeof resolveMemberSchedule>["preset"]
  scheduleLabel: string
  scheduleDescription: string
  pricingNote: string
  packageLabel: string
}

export type CalculatorEstimate = AdminCalculatorCost & {
  members: CalculatorEstimateMemberLine[]
}

export function buildCalculatorEstimate(input: {
  members: CalculatorMember[]
  attendance: Record<string, MemberAttendance>
  lodgingType: LodgingType
  numNights: number
  rates: Record<string, RateRow[]> | undefined
}): CalculatorEstimate {
  const cost = computeAdminCalculatorCost(input)

  return {
    ...cost,
    members: cost.members.map((line) => {
      const att = input.attendance[line.member.id]
      const schedule = resolveMemberSchedule(att)
      return {
        ...line,
        schedulePreset: schedule.preset,
        scheduleLabel: schedule.label,
        scheduleDescription: schedule.description,
        pricingNote: schedule.pricingNote,
        packageLabel: packageTypeLabel(line.packageType),
      }
    }),
  }
}
