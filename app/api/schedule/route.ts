import { NextResponse } from "next/server"
import { LU_SCHEDULE_ITEMS, scheduleData } from "@/lib/schedule-data"

export const dynamic = "force-static"

const DAY_TO_ISO: Record<string, string> = {
  Monday: "2027-05-03",
  Tuesday: "2027-05-04",
  Wednesday: "2027-05-05",
  Thursday: "2027-05-06",
  Friday: "2027-05-07",
}

/** Public schedule JSON for native clients (iOS app). */
export async function GET() {
  return NextResponse.json({
    year: 2027,
    dateRange: "May 3–7, 2027",
    location: "Lake Williamson Christian Center, Carlinville, IL",
    draftNotice: "Based on the 2026 schedule — may change slightly for 2027",
    days: scheduleData,
    dayDates: DAY_TO_ISO,
    luItems: LU_SCHEDULE_ITEMS,
  })
}
