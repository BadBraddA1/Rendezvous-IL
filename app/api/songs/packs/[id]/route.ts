import { NextResponse } from "next/server"
import { authUserContext } from "@/lib/clerk-auth"
import { userHasRegistrationForYear } from "@/lib/family-directory"
import { getSongPackDetail } from "@/lib/song-packs"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const ctx = await authUserContext(request)
  if (!ctx) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    const { id } = await params
    const pack = await getSongPackDetail(id, { publishedOnly: true })
    if (!pack) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const allowed = await userHasRegistrationForYear(
      ctx.userId,
      ctx.email,
      pack.event_year,
    )
    if (!allowed) {
      return NextResponse.json({ error: "Registration required for this year" }, { status: 403 })
    }

    return NextResponse.json({ pack })
  } catch (error) {
    console.error("[songs/packs/id] GET error:", error)
    return NextResponse.json({ error: "Failed to load song pack" }, { status: 500 })
  }
}
