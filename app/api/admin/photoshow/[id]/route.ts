import { NextResponse } from "next/server"
import { getCurrentAdmin, getAdminPermissions } from "@/lib/clerk-auth"
import {
  deletePhotoshowPhoto,
  updatePhotoshowPhoto,
} from "@/lib/live-updates/photoshow"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const photo = await updatePhotoshowPhoto(id, {
      caption: body.caption !== undefined ? body.caption : undefined,
      isActive: typeof body.is_active === "boolean" ? body.is_active : undefined,
      sortOrder: typeof body.sort_order === "number" ? body.sort_order : undefined,
    })

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    return NextResponse.json({ photo })
  } catch (error) {
    console.error("[admin/photoshow] PATCH error:", error)
    return NextResponse.json({ error: "Failed to update photo" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  try {
    const deleted = await deletePhotoshowPhoto(id)
    if (!deleted) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[admin/photoshow] DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 })
  }
}
