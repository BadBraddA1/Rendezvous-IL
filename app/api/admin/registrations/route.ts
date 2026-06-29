import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { getAdminPermissions } from "@/lib/clerk-auth"
import { sql } from "@/lib/db"

export async function GET(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const lodging = searchParams.get("lodging")
    const hasSearch = search.length > 0
    const permissions = getAdminPermissions(admin.role)

    if (!hasSearch && !permissions.canViewRegistrations) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (hasSearch && !permissions.canViewRegistrations && !permissions.canCheckIn) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const hasLodging = lodging && lodging !== "all"
    const searchPattern = `%${search}%`

    let registrations: any[] = []

    if (hasSearch && hasLodging) {
      registrations = await sql`
        SELECT 
          r.*,
          COUNT(fm.id) as attendee_count,
          (COALESCE(r.lodging_total, 0) + COALESCE(r.tshirt_total, 0) + COALESCE(r.climbing_tower_total, 0) + COALESCE(r.registration_fee, 0)) as total_cost
        FROM registrations r
        LEFT JOIN family_members fm ON r.id = fm.registration_id
        WHERE (r.family_last_name ILIKE ${searchPattern} OR r.email ILIKE ${searchPattern})
          AND r.lodging_type = ${lodging}
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `
    } else if (hasSearch) {
      registrations = await sql`
        SELECT 
          r.*,
          COUNT(fm.id) as attendee_count,
          (COALESCE(r.lodging_total, 0) + COALESCE(r.tshirt_total, 0) + COALESCE(r.climbing_tower_total, 0) + COALESCE(r.registration_fee, 0)) as total_cost
        FROM registrations r
        LEFT JOIN family_members fm ON r.id = fm.registration_id
        WHERE (r.family_last_name ILIKE ${searchPattern} OR r.email ILIKE ${searchPattern})
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `
    } else if (hasLodging) {
      registrations = await sql`
        SELECT 
          r.*,
          COUNT(fm.id) as attendee_count,
          (COALESCE(r.lodging_total, 0) + COALESCE(r.tshirt_total, 0) + COALESCE(r.climbing_tower_total, 0) + COALESCE(r.registration_fee, 0)) as total_cost
        FROM registrations r
        LEFT JOIN family_members fm ON r.id = fm.registration_id
        WHERE r.lodging_type = ${lodging}
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `
    } else {
      registrations = await sql`
        SELECT 
          r.*,
          COUNT(fm.id) as attendee_count,
          (COALESCE(r.lodging_total, 0) + COALESCE(r.tshirt_total, 0) + COALESCE(r.climbing_tower_total, 0) + COALESCE(r.registration_fee, 0)) as total_cost
        FROM registrations r
        LEFT JOIN family_members fm ON r.id = fm.registration_id
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `
    }

    return NextResponse.json(registrations)
  } catch (error) {
    console.error("[v0] Registrations fetch error:", error)
    return NextResponse.json([], { status: 200 })
  }
}
