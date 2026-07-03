import { NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { fetchDirectoryEntries, ensureFamilyDirectorySchema, userHasRegistrationForYear } from "@/lib/family-directory"
import { isDirectoryYearEnabled } from "@/lib/directory-settings"
import { authUserId, getCurrentAdmin } from "@/lib/clerk-auth"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = parseRegistrationEventYear(searchParams.get("year"))

  const userId = await authUserId()
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    await ensureFamilyDirectorySchema()

    const yearEnabled = await isDirectoryYearEnabled(year)
    const admin = yearEnabled ? null : await getCurrentAdmin()
    if (!yearEnabled && !admin) {
      return NextResponse.json(
        {
          error: `The Rendezvous ${year} family directory is not open yet.`,
          disabled: true,
        },
        { status: 403 },
      )
    }

    const user = await currentUser()
    const email = user?.emailAddresses?.[0]?.emailAddress
    const hasAccess = await userHasRegistrationForYear(userId, email, year)

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: `Family directory is for registered ${year} families.`,
          hasAccess: false,
        },
        { status: 403 },
      )
    }

    const families = await fetchDirectoryEntries(year)
    return NextResponse.json({ year, hasAccess: true, families })
  } catch (error) {
    console.error("[directory] GET error:", error)
    return NextResponse.json({ error: "Failed to load family directory" }, { status: 500 })
  }
}
