import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * Check if the current user has attended a specific year
 * Used to grant access to year-specific maps without password
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = searchParams.get("year")

  if (!year) {
    return NextResponse.json({ hasAttended: false, error: "Year required" }, { status: 400 })
  }

  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ hasAttended: false })
  }

  try {
    // Get the user's email from Clerk
    const user = await currentUser()
    const userEmail = user?.emailAddresses?.[0]?.emailAddress

    if (!userEmail) {
      return NextResponse.json({ hasAttended: false })
    }

    // Check if they have a registration for this year
    // We check by email match and registration year
    const [registration] = await sql`
      SELECT id FROM registrations
      WHERE LOWER(email) = LOWER(${userEmail})
      AND EXTRACT(YEAR FROM created_at) = ${parseInt(year)}
      LIMIT 1
    `

    // Also check if they're linked to a family that has a registration
    const [familyRegistration] = await sql`
      SELECT r.id 
      FROM registrations r
      JOIN families f ON LOWER(r.email) = LOWER(f.email)
      WHERE f.clerk_user_id = ${userId}
      AND EXTRACT(YEAR FROM r.created_at) = ${parseInt(year)}
      LIMIT 1
    `

    const hasAttended = !!(registration || familyRegistration)

    return NextResponse.json({ hasAttended })
  } catch (error) {
    console.error("[Check Attendee] Error:", error)
    return NextResponse.json({ hasAttended: false })
  }
}
