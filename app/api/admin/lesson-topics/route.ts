import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { createTopic, listTopics } from "@/lib/lesson-bids"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const year = parseRegistrationEventYear(req.nextUrl.searchParams.get("year"))
    return NextResponse.json({ topics: await listTopics(year) })
  } catch (error) {
    console.error("[admin/lesson-topics] GET error:", error)
    return NextResponse.json({ error: "Failed to load lesson topics" }, { status: 500 })
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
    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 })
    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null
    const year = parseRegistrationEventYear(body.year)

    await createTopic(title, description, year)

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "create_lesson_topic",
      "lesson_topic",
      undefined,
      { title, event_year: year },
      ipAddress,
      userAgent,
    )
    return NextResponse.json({ success: true, topics: await listTopics(year) })
  } catch (error) {
    console.error("[admin/lesson-topics] POST error:", error)
    return NextResponse.json({ error: "Failed to create lesson topic" }, { status: 500 })
  }
}
