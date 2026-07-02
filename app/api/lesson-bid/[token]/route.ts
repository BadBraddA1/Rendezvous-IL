import { NextResponse } from "next/server"
import { submitBidPicks } from "@/lib/lesson-bids"

export const dynamic = "force-dynamic"

/** Public endpoint — the unguessable token is the credential. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const body = await request.json().catch(() => ({}))
    const picks = Array.isArray(body.picks)
      ? body.picks.map((p: unknown) => Number(p)).filter((p: number) => Number.isFinite(p))
      : []

    const result = await submitBidPicks(token, picks)
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[lesson-bid] Failed to save picks:", error)
    return NextResponse.json({ error: "Failed to save your picks" }, { status: 500 })
  }
}
