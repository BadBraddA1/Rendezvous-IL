import { NextResponse } from "next/server"
import { claimTopicByToken, updateBidLessonDetails } from "@/lib/lesson-bids"

export const dynamic = "force-dynamic"

/** Public endpoint — the unguessable token is the credential. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const body = await request.json().catch(() => ({}))

    // After claiming, the same link lets the presenter save their lesson
    // title and scripture reading.
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

    // First come, first served: claim one open topic.
    const topicId = Number(body.topicId)
    if (!Number.isFinite(topicId)) {
      return NextResponse.json({ error: "Pick a topic" }, { status: 400 })
    }

    const result = await claimTopicByToken(token, topicId)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.reason, taken: result.taken ?? false },
        { status: result.taken ? 409 : 400 },
      )
    }
    return NextResponse.json({ success: true, topicTitle: result.topicTitle })
  } catch (error) {
    console.error("[lesson-bid] Failed to save:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
