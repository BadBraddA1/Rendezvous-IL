import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { getHomeBoard, setHomeBoard, type HomeBoardSection } from "@/lib/home-board"
import { revalidatePublicHomeBoard } from "@/lib/home-board-revalidate"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const year = parseRegistrationEventYear(req.nextUrl.searchParams.get("year"))
    return NextResponse.json({ board: await getHomeBoard(year) })
  } catch (error) {
    console.error("[admin/home-board] GET error:", error)
    return NextResponse.json({ error: "Failed to load home board" }, { status: 500 })
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
    const sections = Array.isArray(body.sections)
      ? (body.sections as HomeBoardSection[])
      : []

    const board = await setHomeBoard(year, { sections })

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "update_home_board",
      "home_board",
      year,
      board,
      ipAddress,
      userAgent,
    )

    revalidatePublicHomeBoard()
    return NextResponse.json({ success: true, board })
  } catch (error) {
    console.error("[admin/home-board] PUT error:", error)
    return NextResponse.json({ error: "Failed to save home board" }, { status: 500 })
  }
}
