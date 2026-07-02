import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

/** All worship-service volunteer signups across registrations, with assignment state. */
export async function GET() {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
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
        r.family_last_name
      FROM volunteer_signups vs
      LEFT JOIN registrations r ON vs.registration_id = r.id
      ORDER BY vs.volunteer_type, vs.volunteer_name
    `
    return NextResponse.json({ volunteers })
  } catch (error) {
    console.error("[admin/volunteers] GET error:", error)
    return NextResponse.json({ error: "Failed to load volunteers" }, { status: 500 })
  }
}
