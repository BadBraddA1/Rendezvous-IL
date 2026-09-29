import { NextResponse } from "next/server"
import { getCurrentAdmin } from "@/lib/clerk-auth"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"
import { getStaffDayOf } from "@/lib/staff-day-of"

export const dynamic = "force-dynamic"

/** Compact day-of ops payload for staff phones (check-in + next event + announcements). */
export async function GET(request: Request) {
  const admin = await getCurrentAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const eventYear = parseRegistrationEventYear(searchParams.get("year"))
    const dayOf = await getStaffDayOf(eventYear)
    return NextResponse.json({ admin, ...dayOf })
  } catch (error) {
    console.error("[admin/mobile/day-of]", error)
    return NextResponse.json({ error: "Failed to load day-of status" }, { status: 500 })
  }
}
