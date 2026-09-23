import { getCurrentAdmin } from "@/lib/clerk-auth"
import { userHasRegistrationForYear } from "@/lib/family-directory"
import {
  ARCHIVE_REGISTRATION_EVENT_YEAR,
  DEFAULT_REGISTRATION_EVENT_YEAR,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"

/**
 * Song packs for the live season are gated on registration. Before 2027
 * registration opens, allow prior-year (2026) registrants and staff so packs
 * can be previewed in the apps.
 */
export async function canAccessSongPacks(
  request: Request,
  userId: string,
  email: string | undefined,
  year: number,
): Promise<boolean> {
  if (await getCurrentAdmin(request)) return true

  const eventYear = year as RegistrationEventYear
  if (await userHasRegistrationForYear(userId, email, eventYear)) return true

  if (
    year === DEFAULT_REGISTRATION_EVENT_YEAR &&
    (await userHasRegistrationForYear(userId, email, ARCHIVE_REGISTRATION_EVENT_YEAR))
  ) {
    return true
  }

  return false
}
