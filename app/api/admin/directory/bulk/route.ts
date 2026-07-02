import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import {
  updateAdminDirectoryFamily,
  updateAdminDirectoryMember,
  type AdminDirectoryFamilyUpdate,
  type AdminDirectoryMemberUpdate,
} from "@/lib/admin-directory"

export const dynamic = "force-dynamic"

const FAMILY_TEXT_FIELDS = [
  "family_last_name",
  "husband_first_name",
  "wife_first_name",
  "home_congregation",
  "address",
  "city",
  "state",
  "zip",
] as const

type FamilyPayload = { id: number } & Record<string, unknown>
type MemberPayload = { id: number } & Record<string, unknown>

function parseFamilyUpdates(body: Record<string, unknown>): AdminDirectoryFamilyUpdate | string {
  const updates: AdminDirectoryFamilyUpdate = {}
  for (const field of FAMILY_TEXT_FIELDS) {
    if (body[field] !== undefined) {
      const value = typeof body[field] === "string" ? (body[field] as string).trim() : ""
      if (field === "family_last_name") {
        if (!value) return "Family last name is required"
        updates[field] = value
      } else {
        updates[field] = value || null
      }
    }
  }
  if (body.directory_opt_in !== undefined) updates.directory_opt_in = Boolean(body.directory_opt_in)
  if (body.directory_blurb !== undefined) {
    updates.directory_blurb = body.directory_blurb
      ? String(body.directory_blurb).slice(0, 280)
      : null
  }
  return updates
}

function parseMemberUpdates(body: Record<string, unknown>): AdminDirectoryMemberUpdate | string {
  const updates: AdminDirectoryMemberUpdate = {}
  if (body.first_name !== undefined) {
    const value = typeof body.first_name === "string" ? body.first_name.trim() : ""
    if (!value) return "Member first name is required"
    updates.first_name = value
  }
  if (body.last_name !== undefined) {
    updates.last_name = typeof body.last_name === "string" ? body.last_name.trim() : ""
  }
  if (body.age !== undefined) {
    updates.age = body.age === null || body.age === "" ? null : Number(body.age)
    if (updates.age !== null && (!Number.isFinite(updates.age) || updates.age < 0)) {
      return "Invalid member age"
    }
  }
  if (body.parent_role !== undefined) {
    updates.parent_role =
      body.parent_role === "father" || body.parent_role === "mother" ? body.parent_role : null
  }
  if (body.email !== undefined) {
    updates.email =
      typeof body.email === "string" && body.email.trim() ? body.email.trim() : null
  }
  if (body.phone !== undefined) {
    updates.phone =
      typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null
  }
  if (body.share_contact_directory !== undefined) {
    updates.share_contact_directory = Boolean(body.share_contact_directory)
  }
  return updates
}

/**
 * Save many directory edits at once: { families: [{id, ...fields}], members: [{id, ...fields}] }.
 * Applies every valid change and reports per-item failures instead of aborting the batch.
 */
export async function POST(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const familyPayloads: FamilyPayload[] = Array.isArray(body.families) ? body.families : []
    const memberPayloads: MemberPayload[] = Array.isArray(body.members) ? body.members : []

    if (familyPayloads.length === 0 && memberPayloads.length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    const failures: string[] = []
    let familiesUpdated = 0
    let membersUpdated = 0

    for (const payload of familyPayloads) {
      const familyId = Number(payload.id)
      if (!Number.isInteger(familyId) || familyId <= 0) {
        failures.push(`Invalid family id: ${String(payload.id)}`)
        continue
      }
      const updates = parseFamilyUpdates(payload)
      if (typeof updates === "string") {
        failures.push(`Family ${familyId}: ${updates}`)
        continue
      }
      if (Object.keys(updates).length === 0) continue
      try {
        await updateAdminDirectoryFamily(familyId, updates)
        familiesUpdated++
      } catch (error) {
        console.error(`[admin/directory/bulk] family ${familyId} failed:`, error)
        failures.push(`Family ${familyId}: save failed`)
      }
    }

    for (const payload of memberPayloads) {
      const memberId = Number(payload.id)
      if (!Number.isInteger(memberId) || memberId <= 0) {
        failures.push(`Invalid member id: ${String(payload.id)}`)
        continue
      }
      const updates = parseMemberUpdates(payload)
      if (typeof updates === "string") {
        failures.push(`Member ${memberId}: ${updates}`)
        continue
      }
      if (Object.keys(updates).length === 0) continue
      try {
        await updateAdminDirectoryMember(memberId, updates)
        membersUpdated++
      } catch (error) {
        console.error(`[admin/directory/bulk] member ${memberId} failed:`, error)
        failures.push(`Member ${memberId}: save failed`)
      }
    }

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "bulk_update_directory",
      "family",
      undefined,
      {
        families_updated: familiesUpdated,
        members_updated: membersUpdated,
        family_ids: familyPayloads.map((f) => f.id),
        member_ids: memberPayloads.map((m) => m.id),
        failures,
      },
      ipAddress,
      userAgent,
    )

    return NextResponse.json({
      success: failures.length === 0,
      familiesUpdated,
      membersUpdated,
      failures,
    })
  } catch (error) {
    console.error("[admin/directory/bulk] POST error:", error)
    return NextResponse.json({ error: "Failed to save bulk changes" }, { status: 500 })
  }
}
