import { auth, currentUser } from "@clerk/nextjs/server"
import { resolveFamilyForUser } from "@/lib/family-auth"
import { getYearHub } from "@/lib/year-hub"
import { YearHubGuest } from "@/components/year-hub/year-hub-guest"
import {
  YearHubRegistered,
  YearHubUnregistered,
} from "@/components/year-hub/year-hub-signed-in"

export const dynamic = "force-dynamic"

/**
 * Season home: signed-out compact entry; signed-in year hub for the default
 * event year (2027). Marketing brochure content lives on /about and related pages.
 */
export default async function HomePage() {
  const { userId } = await auth()
  if (!userId) {
    return <YearHubGuest />
  }

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress
  const family = await resolveFamilyForUser(userId, email)
  const hub = await getYearHub(family)

  if (!hub.hasRegistration) {
    return <YearHubUnregistered hub={hub} firstName={user?.firstName} />
  }

  return <YearHubRegistered hub={hub} firstName={user?.firstName} />
}
