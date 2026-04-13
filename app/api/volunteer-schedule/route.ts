import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date")
  const timeSlot = searchParams.get("timeSlot")

  if (!date || !timeSlot) {
    return NextResponse.json(
      { error: "Missing date or timeSlot parameter" },
      { status: 400 }
    )
  }

  try {
    // Fetch volunteer schedule for the given date and time slot (show all regardless of status)
    const volunteers = await sql`
      SELECT 
        volunteer_name,
        volunteer_type,
        prayer_type,
        schedule_status
      FROM volunteer_signups
      WHERE assigned_date = ${date}::date
        AND time_slot = ${timeSlot}
      ORDER BY volunteer_type, prayer_type
    `

    // Organize data into the specified order
    const schedule = {
      openingPrayer: null as string | null,
      leadingSingingA: null as string | null,
      leadingSingingB: null as string | null,
      readingScriptureA: null as string | null,
      presentingLessonA: null as string | null,
      readingScriptureB: null as string | null,
      presentingLessonB: null as string | null,
      closingPrayer: null as string | null,
    }

    for (const v of volunteers) {
      const name = v.volunteer_name
      const type = v.volunteer_type
      const prayerType = v.prayer_type

      if (type === "Leading prayer") {
        if (prayerType === "Opening Prayer") {
          schedule.openingPrayer = name
        } else if (prayerType === "Closing Prayer") {
          schedule.closingPrayer = name
        }
      } else if (type === "Leading singing") {
        if (prayerType === "A") {
          schedule.leadingSingingA = name
        } else if (prayerType === "B") {
          schedule.leadingSingingB = name
        }
      } else if (type === "Reading scripture") {
        if (prayerType === "A") {
          schedule.readingScriptureA = name
        } else if (prayerType === "B") {
          schedule.readingScriptureB = name
        }
      } else if (type === "Presenting a lesson") {
        if (prayerType === "A") {
          schedule.presentingLessonA = name
        } else if (prayerType === "B") {
          schedule.presentingLessonB = name
        }
      }
    }

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error("[v0] Volunteer schedule error:", error)
    return NextResponse.json(
      { error: "Failed to fetch volunteer schedule" },
      { status: 500 }
    )
  }
}
