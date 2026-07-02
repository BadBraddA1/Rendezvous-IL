import type { ArrivalDeparturePlan, FamilyMember } from "@/types/registration"

export const ARRIVAL_OPTIONS = [
  { id: "mon_before_515", label: "Monday — before 5:15 PM" },
  { id: "mon_after_515", label: "Monday — after 5:15 PM" },
  { id: "tue_morning", label: "Tuesday — morning" },
  { id: "tue_afternoon", label: "Tuesday — afternoon / evening" },
  { id: "wed_morning", label: "Wednesday — morning" },
  { id: "wed_afternoon", label: "Wednesday — afternoon / evening" },
  { id: "thu_morning", label: "Thursday — morning" },
  { id: "thu_afternoon", label: "Thursday — afternoon / evening" },
] as const

export const DEPARTURE_OPTIONS = [
  { id: "tue_evening", label: "Tuesday — evening" },
  { id: "tue_after_lunch", label: "Tuesday — after lunch" },
  { id: "wed_evening", label: "Wednesday — evening" },
  { id: "wed_after_lunch", label: "Wednesday — after lunch" },
  { id: "thu_evening", label: "Thursday — evening" },
  { id: "thu_after_lunch", label: "Thursday — after lunch" },
  { id: "fri_after_lunch", label: "Friday — after lunch" },
] as const

export const STANDARD_ARRIVAL_SUMMARY =
  "Standard attendance: arrive Monday before 5:15 PM, depart Friday after lunch."

export const DEFAULT_ARRIVAL_DEPARTURE: ArrivalDeparturePlan = {
  nonStandard: false,
  arrival: "",
  departure: "",
  memberIds: [],
  notes: "",
}

function optionLabel(
  options: readonly { id: string; label: string }[],
  id: string,
): string {
  return options.find((o) => o.id === id)?.label ?? id
}

export function memberDisplayName(member: FamilyMember, familyLastName: string): string {
  const last =
    member.useCustomLastName && member.lastName?.trim()
      ? member.lastName.trim()
      : familyLastName.trim()
  const first = member.firstName.trim()
  if (first && last) return `${first} ${last}`
  return first || last || "Family member"
}

export function validateArrivalDeparture(
  plan: ArrivalDeparturePlan,
  members: FamilyMember[],
): string | null {
  if (!plan.nonStandard) return null
  if (!plan.arrival) return "Choose when you plan to arrive."
  if (!plan.departure) return "Choose when you plan to leave."
  const namedMembers = members.filter((m) => m.firstName.trim())
  if (namedMembers.length === 0) {
    return "Add at least one family member before describing arrival or departure."
  }
  if (plan.memberIds.length === 0) {
    return "Select who this arrival and departure schedule applies to."
  }
  return null
}

/** Human-readable block stored in `arrival_notes` for admin, email, and exports. */
export function formatArrivalDepartureNotes(
  plan: ArrivalDeparturePlan,
  members: FamilyMember[],
  familyLastName: string,
): string | null {
  if (!plan.nonStandard) return null

  const appliesTo = members
    .filter((m) => plan.memberIds.includes(m.id))
    .map((m) => memberDisplayName(m, familyLastName))
    .join(", ")

  const lines = [
    "Non-standard arrival / departure",
    `Arrival: ${optionLabel(ARRIVAL_OPTIONS, plan.arrival)}`,
    `Departure: ${optionLabel(DEPARTURE_OPTIONS, plan.departure)}`,
    `Applies to: ${appliesTo || "—"}`,
  ]

  if (plan.notes.trim()) {
    lines.push(`Notes: ${plan.notes.trim()}`)
  }

  return lines.join("\n")
}

export function arrivalDepartureSummaryLines(
  plan: ArrivalDeparturePlan,
  members: FamilyMember[],
  familyLastName: string,
): string[] {
  if (!plan.nonStandard) {
    return [STANDARD_ARRIVAL_SUMMARY]
  }

  const notes = formatArrivalDepartureNotes(plan, members, familyLastName)
  return notes ? notes.split("\n") : []
}
