import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import {
  updateAdminDirectoryMember,
  type AdminDirectoryMemberUpdate,
} from "@/lib/admin-directory"

export const dynamic = "force-dynamic"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const memberId = Number(id)
  if (!Number.isInteger(memberId) || memberId <= 0) {
    return NextResponse.json({ error: "Invalid member id" }, { status: 400 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const updates: AdminDirectoryMemberUpdate = {}

    if (body.first_name !== undefined) {
      const value = typeof body.first_name === "string" ? body.first_name.trim() : ""
      if (!value) return NextResponse.json({ error: "First name is required" }, { status: 400 })
      updates.first_name = value
    }
    if (body.last_name !== undefined) {
      updates.last_name = typeof body.last_name === "string" ? body.last_name.trim() : ""
    }
    if (body.age !== undefined) {
      updates.age = body.age === null || body.age === "" ? null : Number(body.age)
      if (updates.age !== null && (!Number.isFinite(updates.age) || updates.age < 0)) {
        return NextResponse.json({ error: "Invalid age" }, { status: 400 })
      }
    }
    if (body.parent_role !== undefined) {
      updates.parent_role =
        body.parent_role === "father" || body.parent_role === "mother" ? body.parent_role : null
    }
    if (body.email !== undefined) {
      updates.email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : null
    }
    if (body.phone !== undefined) {
      updates.phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null
    }
    if (body.share_contact_directory !== undefined) {
      updates.share_contact_directory = Boolean(body.share_contact_directory)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    await updateAdminDirectoryMember(memberId, updates)

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "update_directory_member",
      "family_member",
      memberId,
      updates as Record<string, unknown>,
      ipAddress,
      userAgent,
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[admin/directory/members] PATCH error:", error)
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 })
  }
}
