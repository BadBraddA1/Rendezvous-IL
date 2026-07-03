import { NextResponse } from "next/server"
import { authUserContext } from "@/lib/clerk-auth"
import { resolveFamilyForUser } from "@/lib/family-auth"
import {
  getFamilyDirectorySettings,
  setFamilyPhotoUrl,
  updateFamilyDirectorySettings,
  validateFamilyPhoto,
} from "@/lib/family-directory"
import { deleteFamilyPhotoIfStored, uploadFamilyPhoto } from "@/lib/family-photo-storage"

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

    const settings = await getFamilyDirectorySettings(result.family!.id)
    return NextResponse.json({ settings })
  } catch (error) {
    console.error("[family-directory] GET error:", error)
    return NextResponse.json({ error: "Failed to load directory settings" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const result = await requireFamily(request)
    if ("error" in result && result.error) return result.error
    const family = result.family!

    const body = await request.json()
    const directory_opt_in =
      body.directory_opt_in === undefined ? undefined : Boolean(body.directory_opt_in)
    const directory_blurb =
      body.directory_blurb === undefined
        ? undefined
        : body.directory_blurb
          ? String(body.directory_blurb).slice(0, 280)
          : null

    await updateFamilyDirectorySettings(family.id, {
      directory_opt_in,
      directory_blurb,
    })

    const settings = await getFamilyDirectorySettings(family.id)
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error("[family-directory] PATCH error:", error)
    return NextResponse.json({ error: "Failed to update directory settings" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const result = await requireFamily(request)
    if ("error" in result && result.error) return result.error
    const family = result.family!

    const formData = await request.formData()
    const file = formData.get("photo")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Photo file is required" }, { status: 400 })
    }

    const validationError = validateFamilyPhoto(file)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const current = await getFamilyDirectorySettings(family.id)
    const photoUrl = await uploadFamilyPhoto(family.id, await file.arrayBuffer(), file.type)
    await setFamilyPhotoUrl(family.id, photoUrl)
    await deleteFamilyPhotoIfStored(current?.photo_url)

    const settings = await getFamilyDirectorySettings(family.id)
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error("[family-directory] POST photo error:", error)
    const message =
      error instanceof Error ? error.message : "Failed to upload family photo"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const result = await requireFamily(request)
    if ("error" in result && result.error) return result.error
    const family = result.family!

    const current = await getFamilyDirectorySettings(family.id)
    await setFamilyPhotoUrl(family.id, null)
    await deleteFamilyPhotoIfStored(current?.photo_url)

    const settings = await getFamilyDirectorySettings(family.id)
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error("[family-directory] DELETE photo error:", error)
    return NextResponse.json({ error: "Failed to remove family photo" }, { status: 500 })
  }
}
