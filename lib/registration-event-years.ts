export const DEFAULT_REGISTRATION_EVENT_YEAR = 2027

/** Prior gathering — available in admin as archive, not the default dash year. */
export const ARCHIVE_REGISTRATION_EVENT_YEAR = 2026

export const REGISTRATION_EVENT_YEARS = [2027, 2026] as const

export type RegistrationEventYear = (typeof REGISTRATION_EVENT_YEARS)[number]

/**
 * Bumped to v2 so sticky 2026 session prefs from last season reset to 2027.
 * Shared across registrations, volunteers, schedule, directory, home board, shell.
 */
export const REGISTRATION_YEAR_STORAGE_KEY = "rendezvous-admin-event-year-v2"

/** Browser event when the shell (or any page) changes the admin event year. */
export const ADMIN_EVENT_YEAR_CHANGE = "ren-admin-event-year"

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

/** Select / chip labels — mark prior year so staff know it is not the live season. */
export function registrationYearOptionLabel(year: RegistrationEventYear): string {
  if (year === ARCHIVE_REGISTRATION_EVENT_YEAR) {
    return `Rendezvous ${year} (archive)`
  }
  return `Rendezvous ${year}`
}

export function readStoredAdminEventYear(): RegistrationEventYear {
  if (typeof window === "undefined") return DEFAULT_REGISTRATION_EVENT_YEAR
  return parseRegistrationEventYear(window.sessionStorage.getItem(REGISTRATION_YEAR_STORAGE_KEY))
}

export function writeStoredAdminEventYear(year: RegistrationEventYear): void {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(REGISTRATION_YEAR_STORAGE_KEY, String(year))
  window.dispatchEvent(new CustomEvent(ADMIN_EVENT_YEAR_CHANGE, { detail: year }))
}
