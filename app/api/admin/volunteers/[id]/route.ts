import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * Assign a volunteer signup to a worship service slot, or clear the
 * assignment. Assignments feed GET /api/volunteer-schedule (public schedule
 * page and Live Updates).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))

    const [existing] = await sql`SELECT * FROM volunteer_signups WHERE id = ${id}`
    if (!existing) {
      return NextResponse.json({ error: "Volunteer signup not found" }, { status: 404 })
    }

    const assigning = Boolean(body.assigned_date && body.time_slot && body.prayer_type)

    if (assigning) {
      await sql`
        UPDATE volunteer_signups
        SET
          assigned_date = ${String(body.assigned_date)},
          time_slot = ${String(body.time_slot)},
          prayer_type = ${String(body.prayer_type)},
          lesson_title = ${typeof body.lesson_title === "string" ? body.lesson_title : existing.lesson_title},
          scripture_reading = ${typeof body.scripture_reading === "string" ? body.scripture_reading : existing.scripture_reading},
          schedule_status = 'scheduled'
        WHERE id = ${id}
      `
    } else {
      await sql`
        UPDATE volunteer_signups
        SET
          assigned_date = NULL,
          time_slot = NULL,
          prayer_type = NULL,
          schedule_status = 'unscheduled'
        WHERE id = ${id}
      `
    }

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      assigning ? "assign_volunteer" : "unassign_volunteer",
      "volunteer_signup",
      Number(id),
      {
        volunteer_name: existing.volunteer_name,
        volunteer_type: existing.volunteer_type,
        from: {
          assigned_date: existing.assigned_date ?? null,
          time_slot: existing.time_slot ?? null,
          prayer_type: existing.prayer_type ?? null,
        },
        to: assigning
          ? {
              assigned_date: body.assigned_date,
              time_slot: body.time_slot,
              prayer_type: body.prayer_type,
            }
          : null,
      },
      ipAddress,
      userAgent,
    )

    const [volunteer] = await sql`
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
      WHERE vs.id = ${id}
    `
    return NextResponse.json({ success: true, volunteer })
  } catch (error) {
    console.error("[admin/volunteers] PATCH error:", error)
    return NextResponse.json({ error: "Failed to update volunteer" }, { status: 500 })
  }
}
