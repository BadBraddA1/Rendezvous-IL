import { sql } from "@/lib/db"
import { ensureLessonTables } from "@/lib/lesson-bids"
import { LIVE_UPDATE_SCHEDULE } from "@/lib/live-updates/schedule"
import { buildLuItems, getPublicSchedule } from "@/lib/event-schedule"
import { getChicagoWallClock } from "@/lib/live-updates/chicago-time"
import type { ScheduleItem, VolunteerSchedule } from "@/lib/live-updates/types"

type VolunteerRow = {
  volunteer_name: string | null
  volunteer_type: string | null
  prayer_type: string | null
  family_last_name: string | null
  lesson_title: string | null
  lesson_scripture: string | null
}

function emptySchedule(): VolunteerSchedule {
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

function applyVolunteerRow(schedule: VolunteerSchedule, v: VolunteerRow) {
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

function buildScheduleFromRows(rows: VolunteerRow[]): VolunteerSchedule {
  const schedule = emptySchedule()
  for (const row of rows) {
    applyVolunteerRow(schedule, row)
  }
  return schedule
}

/** Next upcoming assembly slot — mirrors live-updates-shell volunteer fetch. */
export async function fetchNextVolunteerScheduleForLiveUpdates(): Promise<VolunteerSchedule | null> {
  const centralNow = getChicagoWallClock()

  // Prefer the admin-edited schedule; fall back to the static one on error.
  let scheduleItems: ScheduleItem[] = LIVE_UPDATE_SCHEDULE
  try {
    const { days } = await getPublicSchedule(2027)
    scheduleItems = buildLuItems(days) as ScheduleItem[]
  } catch {
    // static fallback already assigned
  }

  const nextAssembly = scheduleItems.find((item) => {
    if (!/assembly/i.test(item.title)) return false
    const [y, m, d] = item.date.split("-").map(Number)
    const endH = item.endHour ?? item.startHour + 1
    const endM = item.endMinute ?? item.startMinute
    const endsAt = new Date(y, m - 1, d, endH, endM)
    return endsAt.getTime() > centralNow.getTime()
  })

  if (!nextAssembly) {
    return null
  }

  const timeSlot =
    nextAssembly.startHour < 12 ? "Morning Devotion" : "Evening Devotion"

  await ensureLessonTables()
  const volunteers = await sql`
    SELECT 
      vs.volunteer_name,
      vs.volunteer_type,
      vs.prayer_type,
      r.family_last_name,
      COALESCE(NULLIF(vs.lesson_title, ''), lt.lesson_title, lt.title) as lesson_title,
      COALESCE(NULLIF(vs.scripture_reading, ''), lt.scripture) as lesson_scripture
    FROM volunteer_signups vs
    LEFT JOIN registrations r ON vs.registration_id = r.id
    LEFT JOIN lesson_topics lt ON vs.claimed_lesson_id = lt.id
    WHERE vs.assigned_date = ${nextAssembly.date}
      AND vs.time_slot = ${timeSlot}
    ORDER BY vs.volunteer_type, vs.prayer_type
  `

  return buildScheduleFromRows(volunteers as VolunteerRow[])
}
