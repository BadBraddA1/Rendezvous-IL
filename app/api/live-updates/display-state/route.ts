import { NextResponse } from "next/server"
import { BUILD_VERSION } from "@/lib/build-version"
import { sql } from "@/lib/db"
import {
  buildAvailableViews,
  buildDisplayState,
  hasVolunteerData,
  LIVE_UPDATES_BASE_VIEWS,
} from "@/lib/live-updates/display-state"
import { fetchNextVolunteerScheduleForLiveUpdates } from "@/lib/live-updates/server-volunteer"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [announcementsResult, volunteerSchedule] = await Promise.all([
      sql`
        SELECT id
        FROM announcements
        WHERE is_active = true
          AND show_on_live_updates = true
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
      `,
      fetchNextVolunteerScheduleForLiveUpdates(),
    ])

    const announcementCount = announcementsResult.length
    const availableViews = buildAvailableViews({
      hasVolunteerData: hasVolunteerData(volunteerSchedule),
      announcementCount,
    })

    return NextResponse.json(buildDisplayState(availableViews, BUILD_VERSION))
  } catch (error) {
    console.error("[live-updates/display-state] error:", error)

    // Static fallback list so Pis keep rotating even when DB is briefly unavailable.
    return NextResponse.json(
      buildDisplayState([...LIVE_UPDATES_BASE_VIEWS], BUILD_VERSION),
      { status: 200 },
    )
  }
}
