import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { createSpecialAssignment, listSpecialAssignments } from "@/lib/special-assignments"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const year = parseRegistrationEventYear(req.nextUrl.searchParams.get("year"))
    return NextResponse.json({ assignments: await listSpecialAssignments(year) })
  } catch (error) {
    console.error("[admin/special-assignments] GET error:", error)
    return NextResponse.json({ error: "Failed to load special assignments" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const activityName = typeof body.activityName === "string" ? body.activityName.trim() : ""
    const assignedName = typeof body.assignedName === "string" ? body.assignedName.trim() : ""
    if (!activityName) {
      return NextResponse.json({ error: "Activity is required" }, { status: 400 })
    }
    const year = parseRegistrationEventYear(body.year)

    await createSpecialAssignment(
      {
        activityName,
        assignedName,
        assignedDate: typeof body.assignedDate === "string" && body.assignedDate ? body.assignedDate : null,
        timeSlot: typeof body.timeSlot === "string" && body.timeSlot.trim() ? body.timeSlot.trim() : null,
        notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
      },
      year,
    )

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "create_special_assignment",
      "special_assignment",
      undefined,
      { activity_name: activityName, assigned_name: assignedName, event_year: year },
      ipAddress,
      userAgent,
    )
    return NextResponse.json({ success: true, assignments: await listSpecialAssignments(year) })
  } catch (error) {
    console.error("[admin/special-assignments] POST error:", error)
    return NextResponse.json({ error: "Failed to create special assignment" }, { status: 500 })
  }
}
