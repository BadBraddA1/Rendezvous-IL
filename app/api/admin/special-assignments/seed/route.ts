import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { listSpecialAssignments, seedSpecialAssignments } from "@/lib/special-assignments"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

/** Load last year's activity list into an empty year (no people booked). */
export async function POST(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const year = parseRegistrationEventYear(body.year)

    const inserted = await seedSpecialAssignments(year)
    if (inserted === 0) {
      return NextResponse.json(
        { error: "That year already has assignments — delete them first if you want to re-seed." },
        { status: 409 },
      )
    }

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "seed_special_assignments",
      "special_assignment",
      undefined,
      { event_year: year, inserted },
      ipAddress,
      userAgent,
    )
    return NextResponse.json({ success: true, inserted, assignments: await listSpecialAssignments(year) })
  } catch (error) {
    console.error("[admin/special-assignments] seed error:", error)
    return NextResponse.json({ error: "Failed to seed special assignments" }, { status: 500 })
  }
}
