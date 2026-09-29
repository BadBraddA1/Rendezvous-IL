import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, getAdminPermissions } from "@/lib/admin-auth"
import {
  detectAndStoreFamilyPhotoFaces,
  listFamilyPhotoFaces,
  replaceFamilyPhotoFaces,
  suggestFaceNames,
  updateFamilyPhotoFaceLabels,
} from "@/lib/family-photo-faces"
import { getFamilyDirectorySettings } from "@/lib/family-directory"
import { normalizeDirectoryPhoto } from "@/lib/family-photo-process"

export const dynamic = "force-dynamic"
export const maxDuration = 60

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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireEditor()
  if (error) return error

  const { id } = await params
  const familyId = parseFamilyId(id)
  if (!familyId) return NextResponse.json({ error: "Invalid family id" }, { status: 400 })

  try {
    const [faces, nameSuggestions, settings] = await Promise.all([
      listFamilyPhotoFaces(familyId),
      suggestFaceNames(familyId),
      getFamilyDirectorySettings(familyId),
    ])
    return NextResponse.json({
      faces,
      name_suggestions: nameSuggestions,
      photo_url: settings?.photo_url ?? null,
    })
  } catch (err) {
    console.error("[admin/directory/faces] GET error:", err)
    return NextResponse.json({ error: "Failed to load photo faces" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireEditor()
  if (error) return error

  const { id } = await params
  const familyId = parseFamilyId(id)
  if (!familyId) return NextResponse.json({ error: "Invalid family id" }, { status: 400 })

  try {
    const body = await req.json()
    const updates = Array.isArray(body?.faces) ? body.faces : null
    if (!updates) {
      return NextResponse.json({ error: "faces array is required" }, { status: 400 })
    }

    const normalized = updates
      .map((item: { id?: unknown; label?: unknown }) => ({
        id: Number(item.id),
        label:
          item.label === null || item.label === undefined
            ? null
            : String(item.label).slice(0, 40),
      }))
      .filter((item: { id: number }) => Number.isInteger(item.id) && item.id > 0)

    const faces = await updateFamilyPhotoFaceLabels(familyId, normalized)
    return NextResponse.json({ success: true, faces })
  } catch (err) {
    console.error("[admin/directory/faces] PUT error:", err)
    return NextResponse.json({ error: "Failed to save face names" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireEditor()
  if (error) return error

  const { id } = await params
  const familyId = parseFamilyId(id)
  if (!familyId) return NextResponse.json({ error: "Invalid family id" }, { status: 400 })

  try {
    const settings = await getFamilyDirectorySettings(familyId)
    if (!settings?.photo_url) {
      return NextResponse.json({ error: "Upload a family photo first" }, { status: 400 })
    }

    let body: { faces?: unknown } | null = null
    try {
      body = await req.json()
    } catch {
      body = null
    }

    if (body && Array.isArray(body.faces) && body.faces.length > 0) {
      const boxes = body.faces
        .map((item) => {
          if (!item || typeof item !== "object") return null
          const box = item as Record<string, unknown>
          return {
            x: Number(box.x),
            y: Number(box.y),
            w: Number(box.w),
            h: Number(box.h),
          }
        })
        .filter(
          (box): box is { x: number; y: number; w: number; h: number } =>
            Boolean(box) &&
            Number.isFinite(box!.x) &&
            Number.isFinite(box!.y) &&
            Number.isFinite(box!.w) &&
            Number.isFinite(box!.h),
        )
      const faces = await replaceFamilyPhotoFaces(familyId, settings.photo_url, boxes)
      const nameSuggestions = await suggestFaceNames(familyId)
      return NextResponse.json({
        success: true,
        faces,
        name_suggestions: nameSuggestions,
        photo_url: settings.photo_url,
        source: "client",
      })
    }

    const imageRes = await fetch(settings.photo_url)
    if (!imageRes.ok) {
      return NextResponse.json({ error: "Could not download current photo" }, { status: 502 })
    }
    const bytes = Buffer.from(await imageRes.arrayBuffer())
    const { buffer } = await normalizeDirectoryPhoto(bytes, "image/jpeg")
    const detected = await detectAndStoreFamilyPhotoFaces(familyId, settings.photo_url, buffer)
    const nameSuggestions = await suggestFaceNames(familyId)

    return NextResponse.json({
      success: true,
      faces: detected.faces,
      name_suggestions: nameSuggestions,
      photo_url: settings.photo_url,
      detect_error: detected.error ?? null,
      source: "server",
    })
  } catch (err) {
    console.error("[admin/directory/faces] POST error:", err)
    return NextResponse.json({ error: "Failed to detect faces" }, { status: 500 })
  }
}
