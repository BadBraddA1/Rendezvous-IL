import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { getFamilyDirectorySettings } from "@/lib/family-directory"
import { notifyFamilyCompleteDirectoryProfile } from "@/lib/family-directory-notify"
import { listFamilyPhotoFaces } from "@/lib/family-photo-faces"

export const dynamic = "force-dynamic"

async function requireStaff(request?: Request) {
  const admin = await checkAdminAuth(request)
  if (!admin) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const perms = getAdminPermissions(admin.role)
  if (!perms.canEdit && !perms.canCheckIn) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { admin }
}

/** Nudge a family to name faces / finish directory profile (already has a photo). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { admin, error } = await requireStaff(req)
  if (error) return error

  const familyId = Number((await params).id)
  if (!Number.isInteger(familyId) || familyId <= 0) {
    return NextResponse.json({ error: "Invalid family id" }, { status: 400 })
  }

  try {
    const settings = await getFamilyDirectorySettings(familyId)
    if (!settings?.photo_url) {
      return NextResponse.json(
        { error: "Family has no directory photo yet — upload one first." },
        { status: 400 },
      )
    }

    const faces = await listFamilyPhotoFaces(familyId)
    const unlabeled = faces.filter((f) => !f.label?.trim()).length
    const result = await notifyFamilyCompleteDirectoryProfile(familyId)

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "nudge_directory_profile",
      "family",
      familyId,
      { recipients: result.recipients, unlabeled_faces: unlabeled },
      ipAddress,
      userAgent,
    )

    return NextResponse.json({
      success: true,
      recipients: result.recipients,
      unlabeled_faces: unlabeled,
      message:
        result.recipients > 0
          ? `Pinged ${result.recipients} device${result.recipients === 1 ? "" : "s"}`
          : "No app devices registered for this family yet",
    })
  } catch (err) {
    console.error("[admin/directory/nudge] error:", err)
    return NextResponse.json({ error: "Failed to send nudge" }, { status: 500 })
  }
}
