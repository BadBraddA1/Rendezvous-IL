import { NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { resolveFamilyForUser } from "@/lib/family-auth"
import {
  getFamilyDirectorySettings,
  setFamilyPhotoUrl,
  updateFamilyDirectorySettings,
  validateFamilyPhoto,
} from "@/lib/family-directory"
import { deleteFamilyPhotoIfStored, uploadFamilyPhoto } from "@/lib/family-photo-storage"

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const email = user.emailAddresses[0]?.emailAddress
    const family = await resolveFamilyForUser(user.id, email)
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 })
    }

    const settings = await getFamilyDirectorySettings(family.id)
    return NextResponse.json({ settings })
  } catch (error) {
    console.error("[family-directory] GET error:", error)
    return NextResponse.json({ error: "Failed to load directory settings" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const email = user.emailAddresses[0]?.emailAddress
    const family = await resolveFamilyForUser(user.id, email)
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 })
    }

    const body = await request.json()
    const directory_opt_in =
      body.directory_opt_in === undefined ? undefined : Boolean(body.directory_opt_in)
    const directory_blurb =
      body.directory_blurb === undefined
        ? undefined
        : body.directory_blurb
          ? String(body.directory_blurb).slice(0, 280)
          : null

    if (directory_opt_in) {
      const current = await getFamilyDirectorySettings(family.id)
      if (!current?.photo_url) {
        return NextResponse.json(
          { error: "Upload a family photo before listing in the directory." },
          { status: 400 },
        )
      }
    }

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
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const email = user.emailAddresses[0]?.emailAddress
    const family = await resolveFamilyForUser(user.id, email)
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 })
    }

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

export async function DELETE() {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const email = user.emailAddresses[0]?.emailAddress
    const family = await resolveFamilyForUser(user.id, email)
    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 })
    }

    const current = await getFamilyDirectorySettings(family.id)
    await setFamilyPhotoUrl(family.id, null)
    await updateFamilyDirectorySettings(family.id, {
      directory_opt_in: false,
      directory_blurb: null,
    })
    await deleteFamilyPhotoIfStored(current?.photo_url)

    const settings = await getFamilyDirectorySettings(family.id)
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error("[family-directory] DELETE photo error:", error)
    return NextResponse.json({ error: "Failed to remove family photo" }, { status: 500 })
  }
}
