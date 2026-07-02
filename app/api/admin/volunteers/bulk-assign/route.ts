import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { sql } from "@/lib/db"
import { findAssignmentConflict } from "@/lib/volunteer-scheduling"

export const dynamic = "force-dynamic"

type BulkAssignment = {
  id: number
  assigned_date: string
  time_slot: string
  prayer_type: string
}

/** Apply an approved auto-fill draft: many assignments in one call. */
export async function POST(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const assignments: BulkAssignment[] = Array.isArray(body.assignments)
      ? body.assignments.filter(
          (a: Partial<BulkAssignment>) =>
            a && Number.isFinite(Number(a.id)) && a.assigned_date && a.time_slot && a.prayer_type,
        )
      : []
    if (assignments.length === 0) {
      return NextResponse.json({ error: "No assignments provided" }, { status: 400 })
    }

    let applied = 0
    const skipped: { id: number; reason: string }[] = []

    for (const assignment of assignments) {
      const [signup] = await sql`SELECT * FROM volunteer_signups WHERE id = ${assignment.id}`
      if (!signup) {
        skipped.push({ id: assignment.id, reason: "Signup not found" })
        continue
      }
      if (signup.assigned_date) {
        skipped.push({ id: assignment.id, reason: "Already assigned" })
        continue
      }
      const conflict = await findAssignmentConflict(
        signup,
        assignment.assigned_date,
        assignment.time_slot,
        assignment.prayer_type,
      )
      if (conflict) {
        skipped.push({ id: assignment.id, reason: conflict })
        continue
      }
      await sql`
        UPDATE volunteer_signups
        SET
          assigned_date = ${assignment.assigned_date},
          time_slot = ${assignment.time_slot},
          prayer_type = ${assignment.prayer_type},
          schedule_status = 'scheduled'
        WHERE id = ${assignment.id}
      `
      applied += 1
    }

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "bulk_assign_volunteers",
      "volunteer_signup",
      undefined,
      { applied, skipped: skipped.length, total: assignments.length },
      ipAddress,
      userAgent,
    )

    return NextResponse.json({ success: true, applied, skipped })
  } catch (error) {
    console.error("[admin/volunteers] bulk-assign error:", error)
    return NextResponse.json({ error: "Failed to apply schedule" }, { status: 500 })
  }
}
