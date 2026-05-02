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
        vs.volunteer_name,
        vs.volunteer_type,
        vs.prayer_type,
        vs.schedule_status,
        r.family_last_name,
        lt.title as lesson_title,
        lt.description as lesson_scripture
      FROM volunteer_signups vs
      LEFT JOIN registrations r ON vs.registration_id = r.id
      LEFT JOIN lesson_topics lt ON vs.claimed_lesson_id = lt.id
      WHERE vs.assigned_date = ${date}::date
        AND vs.time_slot = ${timeSlot}
      ORDER BY vs.volunteer_type, vs.prayer_type
    `

    // Organize data into the specified order
    const schedule = {
      openingPrayer: null as string | null,
      leadingSingingA: null as string | null,
      leadingSingingB: null as string | null,
      readingScriptureA: null as string | null,
      presentingLessonA: null as string | null,
      lessonTitleA: null as string | null,
      lessonScriptureA: null as string | null,
      readingScriptureB: null as string | null,
      presentingLessonB: null as string | null,
      lessonTitleB: null as string | null,
      lessonScriptureB: null as string | null,
      closingPrayer: null as string | null,
    }

    for (const v of volunteers) {
      // Combine first name with last name if available
      const firstName = v.volunteer_name || ""
      const lastName = v.family_last_name || ""
      const name = lastName ? `${firstName} ${lastName}` : firstName
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
          schedule.lessonTitleA = v.lesson_title || null
          schedule.lessonScriptureA = v.lesson_scripture || null
        } else if (prayerType === "B") {
          schedule.presentingLessonB = name
          schedule.lessonTitleB = v.lesson_title || null
          schedule.lessonScriptureB = v.lesson_scripture || null
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
