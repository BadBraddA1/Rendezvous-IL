import { NextResponse } from "next/server"
import { getCurrentAdmin, getAdminPermissions } from "@/lib/clerk-auth"
import {
  createSongPack,
  listSongPacks,
  reorderSongPacks,
} from "@/lib/song-packs"
import {
  DEFAULT_REGISTRATION_EVENT_YEAR,
  parseRegistrationEventYear,
} from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const year = parseRegistrationEventYear(
      searchParams.get("year") ?? DEFAULT_REGISTRATION_EVENT_YEAR,
    )
    const packs = await listSongPacks({ eventYear: year })
    return NextResponse.json({ packs, year })
  } catch (error) {
    console.error("[admin/songs] GET error:", error)
    return NextResponse.json({ error: "Failed to load song packs" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    if (Array.isArray(body.orderedIds)) {
      await reorderSongPacks(body.orderedIds.map(String))
      const year = parseRegistrationEventYear(body.year ?? DEFAULT_REGISTRATION_EVENT_YEAR)
      const packs = await listSongPacks({ eventYear: year })
      return NextResponse.json({ packs })
    }

    const name = typeof body.name === "string" ? body.name : ""
    const description = typeof body.description === "string" ? body.description : null
    const year = parseRegistrationEventYear(body.year ?? DEFAULT_REGISTRATION_EVENT_YEAR)
    const pack = await createSongPack({ name, description, eventYear: year })
    return NextResponse.json({ pack })
  } catch (error) {
    console.error("[admin/songs] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to save pack"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
