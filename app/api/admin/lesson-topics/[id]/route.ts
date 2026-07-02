import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { deleteTopic, listTopics, updateTopic } from "@/lib/lesson-bids"
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
    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 })
    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null

    await updateTopic(Number(id), title, description)

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "update_lesson_topic",
      "lesson_topic",
      Number(id),
      { title },
      ipAddress,
      userAgent,
    )
    return NextResponse.json({
      success: true,
      topics: await listTopics(parseRegistrationEventYear(body.year)),
    })
  } catch (error) {
    console.error("[admin/lesson-topics] PATCH error:", error)
    return NextResponse.json({ error: "Failed to update lesson topic" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireEditor()
  if (!admin) return response

  try {
    const { id } = await params
    const deleted = await deleteTopic(Number(id))
    if (!deleted) {
      return NextResponse.json(
        { error: "This topic is claimed by a presenter — un-award it first." },
        { status: 409 },
      )
    }

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "delete_lesson_topic",
      "lesson_topic",
      Number(id),
      undefined,
      ipAddress,
      userAgent,
    )
    const year = parseRegistrationEventYear(req.nextUrl.searchParams.get("year"))
    return NextResponse.json({ success: true, topics: await listTopics(year) })
  } catch (error) {
    console.error("[admin/lesson-topics] DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete lesson topic" }, { status: 500 })
  }
}
