import { NextResponse } from "next/server"
import { authUserContext } from "@/lib/clerk-auth"
import { canAccessSongPacks } from "@/lib/song-packs-access"
import { searchSongPackItems } from "@/lib/song-packs"
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
    const q = (searchParams.get("q") || "").trim()

    const allowed = await canAccessSongPacks(request, ctx.userId, ctx.email, year)
    if (!allowed) {
      return NextResponse.json(
        { error: "Registration required for this year", results: [] },
        { status: 403 },
      )
    }

    if (q.length < 1) {
      return NextResponse.json({ results: [], year, q })
    }

    const results = await searchSongPackItems({ eventYear: year, query: q, limit: 40 })
    return NextResponse.json({ results, year, q })
  } catch (error) {
    console.error("[songs/search] GET error:", error)
    return NextResponse.json({ error: "Failed to search songs" }, { status: 500 })
  }
}
