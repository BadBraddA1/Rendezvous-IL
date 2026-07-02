import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"
import { ensureLessonTables } from "@/lib/lesson-bids"

export const dynamic = "force-dynamic"

/** All worship-service volunteer signups across registrations, with assignment + lesson bid state. */
export async function GET() {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await ensureLessonTables()
    const volunteers = await sql`
      SELECT
        vs.id,
        vs.registration_id,
        vs.volunteer_name,
        vs.volunteer_type,
        vs.assigned_date,
        vs.time_slot,
        vs.prayer_type,
        vs.schedule_status,
        vs.lesson_title,
        vs.scripture_reading,
        vs.notes,
        vs.lesson_bid_sent_at,
        vs.claimed_lesson_id,
        r.family_last_name,
        lt.title as claimed_lesson_title,
        lb.submitted_at as bid_submitted_at,
        lb.invitee_email as bid_email,
        lb.pick_1,
        lb.pick_2,
        lb.pick_3
      FROM volunteer_signups vs
      LEFT JOIN registrations r ON vs.registration_id = r.id
      LEFT JOIN lesson_topics lt ON vs.claimed_lesson_id = lt.id
      LEFT JOIN lesson_bids lb ON vs.lesson_bid_token = lb.token
      ORDER BY vs.volunteer_type, vs.volunteer_name
    `
    return NextResponse.json({ volunteers })
  } catch (error) {
    console.error("[admin/volunteers] GET error:", error)
    return NextResponse.json({ error: "Failed to load volunteers" }, { status: 500 })
  }
}
