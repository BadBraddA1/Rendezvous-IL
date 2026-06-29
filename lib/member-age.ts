/** Age as of Rendezvous 2027 week (matches registration form). */
export const RENDEZVOUS_2027_EVENT_DATE = new Date("2027-05-03")

export type ProfileAgeGroup = "adult" | "13-17" | "6-12" | "0-5"
export type ProfileMemberType = "adult" | "teen" | "child"

export function ageAtEvent(
  dateOfBirth: string,
  eventDate: Date = RENDEZVOUS_2027_EVENT_DATE,
): number {
  const birthDate = new Date(dateOfBirth)
  if (Number.isNaN(birthDate.getTime())) return 0

  let age = eventDate.getFullYear() - birthDate.getFullYear()
  const monthDiff = eventDate.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && eventDate.getDate() < birthDate.getDate())) {
    age--
  }
  return Math.max(0, age)
}

export function deriveAgeGroup(age: number): ProfileAgeGroup {
  if (age >= 18) return "adult"
  if (age >= 13) return "13-17"
  if (age >= 6) return "6-12"
  return "0-5"
}

export function deriveMemberType(age: number): ProfileMemberType {
  if (age >= 18) return "adult"
  if (age >= 13) return "teen"
  return "child"
}

export function deriveMemberClassification(dateOfBirth: string | null | undefined) {
  if (!dateOfBirth) return null

  const age = ageAtEvent(dateOfBirth)
  return {
    age,
    age_group: deriveAgeGroup(age),
    member_type: deriveMemberType(age),
  }
}

/** Age group when member type is chosen manually and no birthday is on file. */
export function ageGroupForMemberType(memberType: ProfileMemberType): ProfileAgeGroup {
  switch (memberType) {
    case "adult":
      return "adult"
    case "teen":
      return "13-17"
    case "child":
      return "6-12"
  }
}

export function formatAgeGroupLabel(ageGroup: string): string {
  switch (ageGroup) {
    case "adult":
      return "Adult"
    case "13-17":
      return "Teen (13–17)"
    case "6-12":
      return "Child (6–12)"
    case "0-5":
      return "Young child (0–5)"
    default:
      return ageGroup
  }
}
