import { NextResponse } from "next/server"
import { getCurrentAdmin, getAdminPermissions } from "@/lib/clerk-auth"
import { listChatPhotoshowChannels } from "@/lib/live-updates/chat-photoshow"
import {
  createPhotoshowPhoto,
  listAllPhotoshowPhotos,
  reorderPhotoshowPhotos,
  uploadPhotoshowPhoto,
  validatePhotoshowPhoto,
} from "@/lib/live-updates/photoshow"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const [photos, chatChannels] = await Promise.all([
      listAllPhotoshowPhotos(),
      listChatPhotoshowChannels(),
    ])
    return NextResponse.json({ photos, chatChannels })
  } catch (error) {
    console.error("[admin/photoshow] GET error:", error)
    return NextResponse.json({ error: "Failed to load photos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      const file = form.get("photo")
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Photo file is required" }, { status: 400 })
      }
      const validationError = validatePhotoshowPhoto(file)
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }
      const caption =
        typeof form.get("caption") === "string" ? String(form.get("caption")) : ""
      const imageUrl = await uploadPhotoshowPhoto(await file.arrayBuffer(), file.type)
      const photo = await createPhotoshowPhoto({ imageUrl, caption })
      return NextResponse.json({ photo })
    }

    const body = await request.json()
    if (Array.isArray(body.orderedIds)) {
      await reorderPhotoshowPhotos(body.orderedIds.map(String))
      const photos = await listAllPhotoshowPhotos()
      return NextResponse.json({ photos })
    }

    return NextResponse.json({ error: "Unsupported request" }, { status: 400 })
  } catch (error) {
    console.error("[admin/photoshow] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to save photo"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
