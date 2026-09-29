import { NextResponse } from "next/server"
import { authUserContext } from "@/lib/clerk-auth"
import { resolveFamilyForUser } from "@/lib/family-auth"
import {
  clearFamilyPhotoFaces,
  detectAndStoreFamilyPhotoFaces,
  listFamilyPhotoFaces,
  replaceFamilyPhotoFaces,
  suggestFaceNames,
  updateFamilyPhotoFaceLabels,
} from "@/lib/family-photo-faces"
import { getFamilyDirectorySettings } from "@/lib/family-directory"
import { normalizeDirectoryPhoto } from "@/lib/family-photo-process"

export const maxDuration = 60

async function requireFamily(request: Request) {
  const ctx = await authUserContext(request)
  if (!ctx) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const family = await resolveFamilyForUser(ctx.userId, ctx.email)
  if (!family) {
    return {
      error: NextResponse.json(
        {
          error:
            "No family profile found for this account. Open Family account on the website once to link your registration.",
        },
        { status: 404 },
      ),
    }
  }

  return { family }
}

export async function GET(request: Request) {
  try {
    const result = await requireFamily(request)
    if ("error" in result && result.error) return result.error
    const family = result.family!

    const [faces, nameSuggestions, settings] = await Promise.all([
      listFamilyPhotoFaces(family.id),
      suggestFaceNames(family.id),
      getFamilyDirectorySettings(family.id),
    ])

    return NextResponse.json({
      faces,
      name_suggestions: nameSuggestions,
      photo_url: settings?.photo_url ?? null,
    })
  } catch (error) {
    console.error("[family-directory/faces] GET error:", error)
    return NextResponse.json({ error: "Failed to load photo faces" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const result = await requireFamily(request)
    if ("error" in result && result.error) return result.error
    const family = result.family!

    const body = await request.json()
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

    const faces = await updateFamilyPhotoFaceLabels(family.id, normalized)
    return NextResponse.json({ success: true, faces })
  } catch (error) {
    console.error("[family-directory/faces] PUT error:", error)
    return NextResponse.json({ error: "Failed to save face names" }, { status: 500 })
  }
}

/**
 * Re-run AI face detection, OR accept on-device boxes from the app:
 * `{ faces: [{ x, y, w, h }] }` — stores those boxes (no Gemini call).
 */
export async function POST(request: Request) {
  try {
    const result = await requireFamily(request)
    if ("error" in result && result.error) return result.error
    const family = result.family!

    const settings = await getFamilyDirectorySettings(family.id)
    if (!settings?.photo_url) {
      return NextResponse.json({ error: "Upload a family photo first" }, { status: 400 })
    }

    let body: { faces?: unknown } = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const nameSuggestions = await suggestFaceNames(family.id)

    if (Array.isArray(body.faces) && body.faces.length > 0) {
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
      const faces = await replaceFamilyPhotoFaces(family.id, settings.photo_url, boxes)
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
    const detected = await detectAndStoreFamilyPhotoFaces(family.id, settings.photo_url, buffer)

    return NextResponse.json({
      success: true,
      faces: detected.faces,
      name_suggestions: nameSuggestions,
      photo_url: settings.photo_url,
      detect_error: detected.error ?? null,
      source: "server",
    })
  } catch (error) {
    console.error("[family-directory/faces] POST error:", error)
    return NextResponse.json({ error: "Failed to detect faces" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const result = await requireFamily(request)
    if ("error" in result && result.error) return result.error
    await clearFamilyPhotoFaces(result.family!.id)
    return NextResponse.json({ success: true, faces: [] })
  } catch (error) {
    console.error("[family-directory/faces] DELETE error:", error)
    return NextResponse.json({ error: "Failed to clear faces" }, { status: 500 })
  }
}
