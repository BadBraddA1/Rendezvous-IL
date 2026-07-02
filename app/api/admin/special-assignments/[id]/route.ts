import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import {
  deleteSpecialAssignment,
  listSpecialAssignments,
  updateSpecialAssignment,
} from "@/lib/special-assignments"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

async function requireEditor() {
  const admin = await checkAdminAuth()
  if (!admin) return { admin: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (!getAdminPermissions(admin.role).canEdit) {
    return { admin: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { admin, response: null }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireEditor()
  if (!admin) return response

  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const activityName = typeof body.activityName === "string" ? body.activityName.trim() : ""
    const assignedName = typeof body.assignedName === "string" ? body.assignedName.trim() : ""
    if (!activityName) {
      return NextResponse.json({ error: "Activity is required" }, { status: 400 })
    }

    await updateSpecialAssignment(Number(id), {
      activityName,
      assignedName,
      assignedDate: typeof body.assignedDate === "string" && body.assignedDate ? body.assignedDate : null,
      timeSlot: typeof body.timeSlot === "string" && body.timeSlot.trim() ? body.timeSlot.trim() : null,
      notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
    })

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "update_special_assignment",
      "special_assignment",
      Number(id),
      { activity_name: activityName, assigned_name: assignedName },
      ipAddress,
      userAgent,
    )
    return NextResponse.json({
      success: true,
      assignments: await listSpecialAssignments(parseRegistrationEventYear(body.year)),
    })
  } catch (error) {
    console.error("[admin/special-assignments] PATCH error:", error)
    return NextResponse.json({ error: "Failed to update special assignment" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireEditor()
  if (!admin) return response

  try {
    const { id } = await params
    await deleteSpecialAssignment(Number(id))

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "delete_special_assignment",
      "special_assignment",
      Number(id),
      undefined,
      ipAddress,
      userAgent,
    )
    const year = parseRegistrationEventYear(req.nextUrl.searchParams.get("year"))
    return NextResponse.json({ success: true, assignments: await listSpecialAssignments(year) })
  } catch (error) {
    console.error("[admin/special-assignments] DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete special assignment" }, { status: 500 })
  }
}
