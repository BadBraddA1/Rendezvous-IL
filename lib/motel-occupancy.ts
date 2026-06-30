export type MotelOccupancy = "single" | "double" | "triple" | "quad"

/** Ages 6+ pay lodging; infants (0–5) do not count toward room occupancy. */
export function isPayingAttendeeAge(age: number): boolean {
  return age >= 6
}

export function countPayingAttendees(counts: {
  adults?: number
  youth?: number
  children?: number
}): number {
  return (counts.adults ?? 0) + (counts.youth ?? 0) + (counts.children ?? 0)
}

export function motelOccupancyFromPayingCount(payingCount: number): MotelOccupancy {
  if (payingCount <= 1) return "single"
  if (payingCount === 2) return "double"
  if (payingCount === 3) return "triple"
  return "quad"
}

export function payingAttendeeLabel(count: number): string {
  return `${count} paying ${count === 1 ? "person" : "people"}`
}
