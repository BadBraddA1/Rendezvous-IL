export const DEFAULT_REGISTRATION_EVENT_YEAR = 2027

export const REGISTRATION_EVENT_YEARS = [2027, 2026] as const

export type RegistrationEventYear = (typeof REGISTRATION_EVENT_YEARS)[number]

export const REGISTRATION_YEAR_STORAGE_KEY = "rendezvous-admin-registration-year"

export function parseRegistrationEventYear(
  value: string | number | null | undefined,
): RegistrationEventYear {
  const year = Number(value)
  if (year === 2026 || year === 2027) return year
  return DEFAULT_REGISTRATION_EVENT_YEAR
}

export function registrationYearLabel(year: RegistrationEventYear): string {
  return `Rendezvous ${year}`
}
