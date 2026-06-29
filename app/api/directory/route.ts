import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { fetchDirectoryEntries, ensureFamilyDirectorySchema, userHasRegistrationForYear } from "@/lib/family-directory"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = parseRegistrationEventYear(searchParams.get("year"))

  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    await ensureFamilyDirectorySchema()
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
