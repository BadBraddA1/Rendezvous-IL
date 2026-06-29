import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { userHasRegistrationForYear } from "@/lib/family-directory"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

/**
 * Check if the current user has a registration for a specific event year.
 * Used to grant access to year-specific maps and the family directory.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = parseRegistrationEventYear(searchParams.get("year"))

  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ hasAttended: false })
  }

  try {
    const user = await currentUser()
    const userEmail = user?.emailAddresses?.[0]?.emailAddress
    const hasAttended = await userHasRegistrationForYear(userId, userEmail, year)

    return NextResponse.json({ hasAttended, year })
  } catch (error) {
    console.error("[Check Attendee] Error:", error)
    return NextResponse.json({ hasAttended: false })
  }
}
