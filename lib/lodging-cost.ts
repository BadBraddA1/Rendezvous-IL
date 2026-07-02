import type { FamilyMember, LodgingType } from "@/types/registration"

/**
 * Lodging pricing shared by the registration Lodging step and the express
 * re-registration flow (which must compute totals even when the user never
 * opens the lodging editor).
 */
export function calculateLodgingCost(
  lodgingType: LodgingType,
  familyMembers: FamilyMember[],
): { total: number; updatedMembers: FamilyMember[] } {
  const members = familyMembers.filter((m) => m.age >= 0)
  const payingCount = members.filter((m) => m.age >= 6).length

  let total = 0
  const updatedMembers = members.map((member) => {
    let cost = 0

    if (lodgingType.startsWith("motel")) {
      if (member.age <= 5) {
        cost = 0
      } else if (member.age >= 6 && member.age <= 11) {
        cost = 190
      } else if (member.age >= 12 && member.age <= 17) {
        cost = 235
      } else {
        if (payingCount === 1) {
          cost = 515
        } else if (payingCount === 2) {
          cost = 350
        } else if (payingCount === 3) {
          cost = 315
        } else {
          cost = 300
        }
      }
    } else {
      if (member.age <= 5) {
        cost = 0
      } else if (member.age >= 6 && member.age <= 11) {
        cost = 75
      } else {
        cost = 155
      }
    }

    total += cost
    return { ...member, personCost: cost }
  })

  if (lodgingType === "rv") {
    total += 120
  } else if (lodgingType === "tent") {
    total += 80
  }

  return { total, updatedMembers }
}
