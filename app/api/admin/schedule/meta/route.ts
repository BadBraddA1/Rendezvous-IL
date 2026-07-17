import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { getScheduleMeta, setScheduleMeta } from "@/lib/schedule-meta"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const year = parseRegistrationEventYear(req.nextUrl.searchParams.get("year"))
    return NextResponse.json({ meta: await getScheduleMeta(year) })
  } catch (error) {
    console.error("[admin/schedule/meta] GET error:", error)
    return NextResponse.json({ error: "Failed to load schedule header" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const year = parseRegistrationEventYear(body.year ?? req.nextUrl.searchParams.get("year"))
    const meta = await setScheduleMeta(year, {
      dateRange: body.dateRange,
      location: body.location,
      draftNotice: body.draftNotice,
    })

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "update_schedule_meta",
      "schedule_meta",
      year,
      meta,
      ipAddress,
      userAgent,
    )

    return NextResponse.json({ success: true, meta })
  } catch (error) {
    console.error("[admin/schedule/meta] PUT error:", error)
    return NextResponse.json({ error: "Failed to save schedule header" }, { status: 500 })
  }
}
