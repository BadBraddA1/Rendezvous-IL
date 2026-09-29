import { NextResponse } from "next/server"
import { DEFAULT_REGISTRATION_EVENT_YEAR } from "@/lib/registration-event-years"
import { fetchOnDutyAssignments } from "@/lib/live-updates/on-duty"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const assignments = await fetchOnDutyAssignments(DEFAULT_REGISTRATION_EVENT_YEAR)
    return NextResponse.json(
      { assignments, eventYear: DEFAULT_REGISTRATION_EVENT_YEAR },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    )
  } catch (error) {
    console.error("[live-updates/on-duty] error:", error)
    return NextResponse.json({ assignments: [] }, { status: 200 })
  }
}
