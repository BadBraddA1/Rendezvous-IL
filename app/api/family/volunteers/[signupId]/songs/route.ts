import { NextResponse } from "next/server"
import { authUserContext } from "@/lib/clerk-auth"
import { resolveFamilyForUser } from "@/lib/family-auth"
import {
  assertFamilyCanSubmitWorshipSongs,
  getWorshipSongsForSignup,
  normalizeSongPicks,
  upsertWorshipSongSubmission,
  validateSongPicks,
} from "@/lib/worship-song-submissions"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ signupId: string }> }

/** GET current song set for a Leading singing signup (family-owned). */
export async function GET(request: Request, { params }: Params) {
  try {
    const ctx = await authUserContext(request)
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const family = await resolveFamilyForUser(ctx.userId, ctx.email)
    if (!family) {
      return NextResponse.json({ error: "No family profile linked" }, { status: 404 })
    }

    const { signupId: rawId } = await params
    const signupId = Number(rawId)
    if (!Number.isFinite(signupId) || signupId <= 0) {
      return NextResponse.json({ error: "Invalid signup id" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const access = await assertFamilyCanSubmitWorshipSongs(
      family,
      signupId,
      searchParams.get("year"),
    )
    const submission = await getWorshipSongsForSignup(access.signupId)
    return NextResponse.json({
      signupId: access.signupId,
      volunteerName: access.volunteerName,
      eventYear: access.eventYear,
      submission,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load"
    const status =
      message.includes("not found") || message.includes("No registration")
        ? 404
        : message.includes("Only Leading") || message.includes("after you are scheduled")
          ? 403
          : 400
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * PUT song set for a Leading singing signup.
 * Body: { songs: WorshipSongPick[], note?: string }
 */
export async function PUT(request: Request, { params }: Params) {
  try {
    const ctx = await authUserContext(request)
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const family = await resolveFamilyForUser(ctx.userId, ctx.email)
    if (!family) {
      return NextResponse.json({ error: "No family profile linked" }, { status: 404 })
    }

    const { signupId: rawId } = await params
    const signupId = Number(rawId)
    if (!Number.isFinite(signupId) || signupId <= 0) {
      return NextResponse.json({ error: "Invalid signup id" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const access = await assertFamilyCanSubmitWorshipSongs(
      family,
      signupId,
      searchParams.get("year"),
    )

    const body = (await request.json().catch(() => ({}))) as {
      songs?: unknown
      note?: string | null
    }
    const validationError = validateSongPicks(body.songs)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
    const songs = normalizeSongPicks(body.songs)
    const submission = await upsertWorshipSongSubmission({
      signupId: access.signupId,
      eventYear: access.eventYear,
      songs,
      note: body.note ?? null,
      clerkUserId: ctx.userId,
    })
    return NextResponse.json({ submission })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed"
    const status =
      message.includes("not found") || message.includes("No registration")
        ? 404
        : message.includes("Only Leading") || message.includes("after you are scheduled")
          ? 403
          : 400
    console.error("[family/volunteers/songs] PUT:", error)
    return NextResponse.json({ error: message }, { status })
  }
}
