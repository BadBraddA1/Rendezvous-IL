import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import {
  updateAdminDirectoryFamily,
  type AdminDirectoryFamilyUpdate,
} from "@/lib/admin-directory"

export const dynamic = "force-dynamic"

const TEXT_FIELDS = [
  "family_last_name",
  "husband_first_name",
  "wife_first_name",
  "home_congregation",
  "address",
  "city",
  "state",
  "zip",
] as const

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const familyId = Number(id)
  if (!Number.isInteger(familyId) || familyId <= 0) {
    return NextResponse.json({ error: "Invalid family id" }, { status: 400 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const updates: AdminDirectoryFamilyUpdate = {}

    for (const field of TEXT_FIELDS) {
      if (body[field] !== undefined) {
        const value = typeof body[field] === "string" ? body[field].trim() : ""
        if (field === "family_last_name") {
          if (!value) {
            return NextResponse.json({ error: "Family last name is required" }, { status: 400 })
          }
          updates[field] = value
        } else {
          updates[field] = value || null
        }
      }
    }
    if (body.directory_opt_in !== undefined) {
      updates.directory_opt_in = Boolean(body.directory_opt_in)
    }
    if (body.directory_blurb !== undefined) {
      updates.directory_blurb = body.directory_blurb
        ? String(body.directory_blurb).slice(0, 280)
        : null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    await updateAdminDirectoryFamily(familyId, updates)

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "update_directory_family",
      "family",
      familyId,
      updates as Record<string, unknown>,
      ipAddress,
      userAgent,
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[admin/directory/families] PATCH error:", error)
    return NextResponse.json({ error: "Failed to update family" }, { status: 500 })
  }
}
