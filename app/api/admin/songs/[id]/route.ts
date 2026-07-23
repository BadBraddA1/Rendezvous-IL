import { NextResponse } from "next/server"
import { getCurrentAdmin, getAdminPermissions } from "@/lib/clerk-auth"
import {
  deleteSongPack,
  getSongPackDetail,
  updateSongPack,
} from "@/lib/song-packs"
import { notifySongPackUpdated } from "@/lib/song-packs-notify"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params
    const pack = await getSongPackDetail(id)
    if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ pack })
  } catch (error) {
    console.error("[admin/songs/id] GET error:", error)
    return NextResponse.json({ error: "Failed to load pack" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params
    const before = await getSongPackDetail(id)
    const body = await request.json()
    const pack = await updateSongPack(id, {
      name: typeof body.name === "string" ? body.name : undefined,
      description:
        body.description === null
          ? null
          : typeof body.description === "string"
            ? body.description
            : undefined,
      isPublished: typeof body.is_published === "boolean" ? body.is_published : undefined,
      sortOrder: typeof body.sort_order === "number" ? body.sort_order : undefined,
    })
    if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const justPublished = !before?.is_published && pack.is_published
    if (justPublished) {
      void notifySongPackUpdated(pack.name)
    }

    return NextResponse.json({ pack })
  } catch (error) {
    console.error("[admin/songs/id] PATCH error:", error)
    const message = error instanceof Error ? error.message : "Failed to update pack"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params
    const ok = await deleteSongPack(id)
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[admin/songs/id] DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete pack" }, { status: 500 })
  }
}
