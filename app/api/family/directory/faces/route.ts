import { NextResponse } from "next/server"
import { authUserContext } from "@/lib/clerk-auth"
import { resolveFamilyForUser } from "@/lib/family-auth"
import {
  clearFamilyPhotoFaces,
  detectAndStoreFamilyPhotoFaces,
  listFamilyPhotoFaces,
  suggestFaceNames,
  updateFamilyPhotoFaceLabels,
} from "@/lib/family-photo-faces"
import { getFamilyDirectorySettings } from "@/lib/family-directory"
import { normalizeDirectoryPhoto } from "@/lib/family-photo-process"

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

/** Re-run AI face detection on the current directory photo. */
export async function POST(request: Request) {
  try {
    const result = await requireFamily(request)
    if ("error" in result && result.error) return result.error
    const family = result.family!

    const settings = await getFamilyDirectorySettings(family.id)
    if (!settings?.photo_url) {
      return NextResponse.json({ error: "Upload a family photo first" }, { status: 400 })
    }

    const imageRes = await fetch(settings.photo_url)
    if (!imageRes.ok) {
      return NextResponse.json({ error: "Could not download current photo" }, { status: 502 })
    }
    const bytes = Buffer.from(await imageRes.arrayBuffer())
    const { buffer } = await normalizeDirectoryPhoto(bytes, "image/jpeg")
    const faces = await detectAndStoreFamilyPhotoFaces(family.id, settings.photo_url, buffer)
    const nameSuggestions = await suggestFaceNames(family.id)

    return NextResponse.json({
      success: true,
      faces,
      name_suggestions: nameSuggestions,
      photo_url: settings.photo_url,
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
