import { type NextRequest, NextResponse } from "next/server"
import { checkCheckInAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"
import { normalizeRegistrationRow } from "@/lib/normalize-string-array"

export async function GET(req: NextRequest) {
  const admin = await checkCheckInAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const rows = await sql`
      SELECT 
        r.id,
        r.family_last_name,
        r.email,
        r.husband_phone,
        r.wife_phone,
        r.lodging_type,
        r.checkin_qr_code,
        r.checked_in,
        r.checked_in_at,
        r.room_keys,
        r.pre_assigned_keys,
        r.keys_taken_count,
        r.keys_returned,
        r.keys_returned_at,
        r.tshirts_distributed,
        COUNT(fm.id) as attendee_count
      FROM registrations r
      LEFT JOIN family_members fm ON fm.registration_id = r.id
      WHERE r.checked_in = 1
      GROUP BY r.id
      ORDER BY r.checked_in_at DESC
    `
    return NextResponse.json(rows.map((row) => normalizeRegistrationRow(row)))
  } catch (error) {
    console.error("[v0] Failed to fetch checked-in registrations:", error)
    return NextResponse.json({ error: "Failed to fetch checked-in registrations" }, { status: 500 })
  }
}
