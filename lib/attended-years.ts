import { userHasRegistrationForYear } from "@/lib/family-directory"
import {
  REGISTRATION_EVENT_YEARS,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"

/** Event years this Clerk user has registered for (newest first). */
export async function listAttendedYears(
  clerkUserId: string,
  email?: string,
): Promise<RegistrationEventYear[]> {
  const years: RegistrationEventYear[] = []

  for (const year of REGISTRATION_EVENT_YEARS) {
    if (await userHasRegistrationForYear(clerkUserId, email, year)) {
      years.push(year)
    }
  }

  return years.sort((a, b) => b - a)
}
