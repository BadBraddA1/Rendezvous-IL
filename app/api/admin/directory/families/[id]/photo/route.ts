import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import {
  getFamilyDirectorySettings,
  setFamilyPhotoUrl,
  validateFamilyPhoto,
} from "@/lib/family-directory"
import { deleteFamilyPhotoIfStored, uploadFamilyPhoto } from "@/lib/family-photo-storage"

export const dynamic = "force-dynamic"

async function requireEditor() {
  const admin = await checkAdminAuth()
  if (!admin) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (!getAdminPermissions(admin.role).canEdit) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { admin }
}

function parseFamilyId(id: string) {
  const familyId = Number(id)
  return Number.isInteger(familyId) && familyId > 0 ? familyId : null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireEditor()
  if (error) return error

  const { id } = await params
  const familyId = parseFamilyId(id)
  if (!familyId) return NextResponse.json({ error: "Invalid family id" }, { status: 400 })

  try {
    const formData = await req.formData()
    const file = formData.get("photo")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Photo file is required" }, { status: 400 })
    }

    const validationError = validateFamilyPhoto(file)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const current = await getFamilyDirectorySettings(familyId)
    const photoUrl = await uploadFamilyPhoto(familyId, await file.arrayBuffer(), file.type)
    await setFamilyPhotoUrl(familyId, photoUrl)
    await deleteFamilyPhotoIfStored(current?.photo_url)

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "update_directory_family_photo",
      "family",
      familyId,
      { photo_url: photoUrl },
      ipAddress,
      userAgent,
    )
    return NextResponse.json({ success: true, photo_url: photoUrl })
  } catch (error) {
    console.error("[admin/directory/photo] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to upload family photo"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireEditor()
  if (error) return error

  const { id } = await params
  const familyId = parseFamilyId(id)
  if (!familyId) return NextResponse.json({ error: "Invalid family id" }, { status: 400 })

  try {
    const current = await getFamilyDirectorySettings(familyId)
    await setFamilyPhotoUrl(familyId, null)
    await deleteFamilyPhotoIfStored(current?.photo_url)

    const { ipAddress, userAgent } = getRequestAuditMeta(req)
    await logAuditAction(
      admin.email,
      "remove_directory_family_photo",
      "family",
      familyId,
      undefined,
      ipAddress,
      userAgent,
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[admin/directory/photo] DELETE error:", error)
    return NextResponse.json({ error: "Failed to remove family photo" }, { status: 500 })
  }
}
