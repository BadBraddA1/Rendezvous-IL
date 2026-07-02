import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { ensureLessonTables } from "@/lib/lesson-bids"

export type VolunteerScheduleSlot = {
  openingPrayer: string | null
  leadingSingingA: string | null
  leadingSingingB: string | null
  readingScriptureA: string | null
  presentingLessonA: string | null
  lessonTitleA: string | null
  lessonScriptureA: string | null
  readingScriptureB: string | null
  presentingLessonB: string | null
  lessonTitleB: string | null
  lessonScriptureB: string | null
  closingPrayer: string | null
}

type VolunteerRow = {
  volunteer_name: string | null
  volunteer_type: string | null
  prayer_type: string | null
  family_last_name: string | null
  lesson_title: string | null
  lesson_scripture: string | null
  assigned_date?: string | Date
  time_slot?: string
}

function emptySchedule(): VolunteerScheduleSlot {
  return {
    openingPrayer: null,
    leadingSingingA: null,
    leadingSingingB: null,
    readingScriptureA: null,
    presentingLessonA: null,
    lessonTitleA: null,
    lessonScriptureA: null,
    readingScriptureB: null,
    presentingLessonB: null,
    lessonTitleB: null,
    lessonScriptureB: null,
    closingPrayer: null,
  }
}

function applyVolunteerRow(schedule: VolunteerScheduleSlot, v: VolunteerRow) {
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

function buildScheduleFromRows(rows: VolunteerRow[]): VolunteerScheduleSlot {
  const schedule = emptySchedule()
  for (const row of rows) {
    applyVolunteerRow(schedule, row)
  }
  return schedule
}

function formatDateKey(value: string | Date | undefined): string {
  if (!value) return ""
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  return String(value).slice(0, 10)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date")
  const timeSlot = searchParams.get("timeSlot")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  if (from && to) {
    try {
      await ensureLessonTables()
      const volunteers = await sql`
        SELECT 
          vs.volunteer_name,
          vs.volunteer_type,
          vs.prayer_type,
          vs.schedule_status,
          vs.assigned_date,
          vs.time_slot,
          r.family_last_name,
          COALESCE(NULLIF(vs.lesson_title, ''), lt.lesson_title, lt.title) as lesson_title,
          COALESCE(NULLIF(vs.scripture_reading, ''), lt.scripture) as lesson_scripture
        FROM volunteer_signups vs
        LEFT JOIN registrations r ON vs.registration_id = r.id
        LEFT JOIN lesson_topics lt ON vs.claimed_lesson_id = lt.id
        WHERE vs.assigned_date >= ${from}
          AND vs.assigned_date <= ${to}
        ORDER BY vs.assigned_date, vs.time_slot, vs.volunteer_type, vs.prayer_type
      `

      const grouped = new Map<string, VolunteerRow[]>()
      for (const row of volunteers as VolunteerRow[]) {
        const key = `${formatDateKey(row.assigned_date)}|${row.time_slot ?? ""}`
        const bucket = grouped.get(key) ?? []
        bucket.push(row)
        grouped.set(key, bucket)
      }

      const schedules: Record<string, VolunteerScheduleSlot> = {}
      for (const [key, rows] of grouped) {
        schedules[key] = buildScheduleFromRows(rows)
      }

      return NextResponse.json({ schedules })
    } catch (error) {
      console.error("[v0] Volunteer schedule week error:", error)
      return NextResponse.json({ error: "Failed to fetch volunteer schedules" }, { status: 500 })
    }
  }

  if (!date || !timeSlot) {
    return NextResponse.json(
      { error: "Missing date or timeSlot parameter" },
      { status: 400 },
    )
  }

  try {
    await ensureLessonTables()
    const volunteers = await sql`
      SELECT 
        vs.volunteer_name,
        vs.volunteer_type,
        vs.prayer_type,
        vs.schedule_status,
        r.family_last_name,
        COALESCE(NULLIF(vs.lesson_title, ''), lt.lesson_title, lt.title) as lesson_title,
        COALESCE(NULLIF(vs.scripture_reading, ''), lt.scripture) as lesson_scripture
      FROM volunteer_signups vs
      LEFT JOIN registrations r ON vs.registration_id = r.id
      LEFT JOIN lesson_topics lt ON vs.claimed_lesson_id = lt.id
      WHERE vs.assigned_date = ${date}
        AND vs.time_slot = ${timeSlot}
      ORDER BY vs.volunteer_type, vs.prayer_type
    `

    return NextResponse.json({ schedule: buildScheduleFromRows(volunteers as VolunteerRow[]) })
  } catch (error) {
    console.error("[v0] Volunteer schedule error:", error)
    return NextResponse.json({ error: "Failed to fetch volunteer schedule" }, { status: 500 })
  }
}
