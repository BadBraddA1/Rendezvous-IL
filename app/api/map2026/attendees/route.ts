import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import {
  fetchDirectoryEntries,
  userHasRegistrationForYear,
} from "@/lib/family-directory"
import { isDirectoryYearEnabled } from "@/lib/directory-settings"
import { getCurrentAdmin } from "@/lib/clerk-auth"
import { loadMap2026Registrations } from "@/lib/map2026-registrations"
import { mergeDirectoryWithMapCoords } from "@/lib/map-attendees"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = parseRegistrationEventYear(searchParams.get("year") ?? 2026)

  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    const yearEnabled = await isDirectoryYearEnabled(year)
    const admin = yearEnabled ? null : await getCurrentAdmin()
    if (!yearEnabled && !admin) {
      return NextResponse.json(
        { error: `The Rendezvous ${year} attendee directory is not open yet.` },
        { status: 403 },
      )
    }

    const user = await currentUser()
    const email = user?.emailAddresses?.[0]?.emailAddress
    const hasAccess = await userHasRegistrationForYear(userId, email, year)
    if (!hasAccess && !admin) {
      return NextResponse.json(
        { error: `Attendee map is for registered ${year} families.` },
        { status: 403 },
      )
    }

    const [directory, geocoded] = await Promise.all([
      fetchDirectoryEntries(year),
      loadMap2026Registrations(),
    ])

    const attendees = mergeDirectoryWithMapCoords(directory, geocoded)

    return NextResponse.json({
      year,
      syncedWithDirectory: true,
      directoryCount: directory.length,
      mapCount: attendees.length,
      attendees,
    })
  } catch (error) {
    console.error("[map2026/attendees] GET error:", error)
    return NextResponse.json({ error: "Failed to load attendee map data" }, { status: 500 })
  }
}
