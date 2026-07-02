import { NextResponse } from "next/server"
import { submitBidPicks, updateBidLessonDetails } from "@/lib/lesson-bids"

export const dynamic = "force-dynamic"

/** Public endpoint — the unguessable token is the credential. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const body = await request.json().catch(() => ({}))

    // After a topic is awarded, the same link lets the presenter save
    // their lesson title and scripture reading.
    if (body.action === "details") {
      const result = await updateBidLessonDetails(
        token,
        String(body.lessonTitle ?? "").trim(),
        String(body.scriptureReading ?? "").trim(),
      )
      if (!result.ok) {
        return NextResponse.json({ error: result.reason }, { status: 400 })
      }
      return NextResponse.json({ success: true })
    }

    const picks = Array.isArray(body.picks)
      ? body.picks.map((p: unknown) => Number(p)).filter((p: number) => Number.isFinite(p))
      : []

    const result = await submitBidPicks(token, picks)
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[lesson-bid] Failed to save:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
