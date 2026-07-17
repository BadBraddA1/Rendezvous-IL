import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { getFamilyById } from "@/lib/family-auth"
import {
  ensureFamilyMembershipSchema,
  listFamilyAccountMembers,
  listFamilyLoginInvites,
  normalizeEmail,
  removeFamilyAccountMember,
  syncPrimaryFamilyMembership,
  upsertFamilyAccountMember,
  type FamilyAccountRole,
  type FamilyAccountSource,
} from "@/lib/family-membership"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const familyId = Number(id)
  if (!Number.isInteger(familyId) || familyId <= 0) {
    return NextResponse.json({ error: "Invalid family id" }, { status: 400 })
  }

  try {
    await ensureFamilyMembershipSchema()
    const family = await getFamilyById(familyId)
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 })
    }

    const accountMembers = await listFamilyAccountMembers(familyId)
    const loginInvites = await listFamilyLoginInvites(familyId)
    return NextResponse.json({ familyId, accountMembers, loginInvites })
  } catch (error) {
    console.error("[admin/families/account-members] GET error:", error)
    return NextResponse.json({ error: "Failed to load account members" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const family = await getFamilyById(familyId)
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const clerkUserId = typeof body.clerk_user_id === "string" ? body.clerk_user_id.trim() : ""
    const email = normalizeEmail(body.email)
    const role: FamilyAccountRole = body.role === "primary" ? "primary" : "member"
    const source: FamilyAccountSource = "admin"

    if (!clerkUserId) {
      return NextResponse.json({ error: "clerk_user_id is required" }, { status: 400 })
    }

    if (role === "primary") {
      await syncPrimaryFamilyMembership(familyId, clerkUserId, email ?? family.email)
    } else {
      await upsertFamilyAccountMember({
        familyId,
        clerkUserId,
        email,
        role: "member",
        source,
      })
    }

    const accountMembers = await listFamilyAccountMembers(familyId)
    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "add_family_account_member",
      "family",
      familyId,
      { clerk_user_id: clerkUserId, email, role },
      ipAddress,
      userAgent,
    )

    return NextResponse.json({ success: true, accountMembers })
  } catch (error) {
    console.error("[admin/families/account-members] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to add account member"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const clerkUserId = typeof body.clerk_user_id === "string" ? body.clerk_user_id.trim() : ""
    if (!clerkUserId) {
      return NextResponse.json({ error: "clerk_user_id is required" }, { status: 400 })
    }

    const removed = await removeFamilyAccountMember(familyId, clerkUserId)
    if (!removed) {
      return NextResponse.json({ error: "Member not found on this family" }, { status: 404 })
    }

    const accountMembers = await listFamilyAccountMembers(familyId)
    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "remove_family_account_member",
      "family",
      familyId,
      { clerk_user_id: clerkUserId },
      ipAddress,
      userAgent,
    )

    return NextResponse.json({ success: true, accountMembers })
  } catch (error) {
    console.error("[admin/families/account-members] DELETE error:", error)
    const message = error instanceof Error ? error.message : "Failed to remove account member"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
