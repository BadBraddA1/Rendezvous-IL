import { NextResponse } from "next/server"
import { chatDemoContextFromRequest } from "@/lib/chat/demo"
import { voteOnPoll } from "@/lib/chat/polls"
import { authUserContext, getCurrentAdmin } from "@/lib/clerk-auth"

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const { id: messageId } = await params
  const demo = chatDemoContextFromRequest(request)
  const ctx = demo
    ? { userId: demo.userId, email: undefined as string | undefined }
    : await authUserContext(request)

  if (!ctx) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const optionIndex = Number(body.option_index)
    if (!Number.isInteger(optionIndex)) {
      return NextResponse.json({ error: "option_index is required" }, { status: 400 })
    }

    const admin = demo ? null : await getCurrentAdmin(request)
    const poll = await voteOnPoll({
      messageId,
      optionIndex,
      clerkUserId: ctx.userId,
      email: ctx.email,
      isAdmin: Boolean(admin),
    })

    return NextResponse.json({ poll })
  } catch (error) {
    console.error("[chat/vote] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to vote"
    const status =
      message === "Forbidden"
        ? 403
        : message.includes("not found") || message.includes("not a poll") || message.includes("Invalid")
          ? 400
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
