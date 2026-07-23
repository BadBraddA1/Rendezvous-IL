import { NextResponse } from "next/server"
import { authUserContext } from "@/lib/clerk-auth"
import { userHasRegistrationForYear } from "@/lib/family-directory"
import { listSongPacks } from "@/lib/song-packs"
import {
  DEFAULT_REGISTRATION_EVENT_YEAR,
  parseRegistrationEventYear,
} from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const ctx = await authUserContext(request)
  if (!ctx) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const year = parseRegistrationEventYear(
      searchParams.get("year") ?? DEFAULT_REGISTRATION_EVENT_YEAR,
    )

    const allowed = await userHasRegistrationForYear(ctx.userId, ctx.email, year)
    if (!allowed) {
      return NextResponse.json(
        { error: "Registration required for this year", packs: [] },
        { status: 403 },
      )
    }

    const packs = await listSongPacks({ eventYear: year, publishedOnly: true })
    return NextResponse.json({ packs, year })
  } catch (error) {
    console.error("[songs/packs] GET error:", error)
    return NextResponse.json({ error: "Failed to load song packs" }, { status: 500 })
  }
}
