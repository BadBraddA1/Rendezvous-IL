/**
 * Discount ends at midnight 12:00 AM Monday March 2, 2026 Central Time (CST = UTC-6)
 * That is 6:00 AM UTC on March 2, 2026
 * Regular registration: $50 (after March 2 - April 15, 2026)
 */
const DISCOUNT_DEADLINE_UTC = new Date("2026-03-02T06:00:00.000Z")

export function calculateRegistrationFee(currentDate: Date = new Date()): number {
  return currentDate < DISCOUNT_DEADLINE_UTC ? 25 : 50
}

export function isDiscountedRegistration(currentDate: Date = new Date()): boolean {
  return currentDate < DISCOUNT_DEADLINE_UTC
}

export function getDiscountDeadline(): Date {
  return DISCOUNT_DEADLINE_UTC
}
