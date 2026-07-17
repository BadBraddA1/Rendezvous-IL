import { NextResponse } from "next/server"
import { chatDemoContextFromRequest } from "@/lib/chat/demo"
import { toggleMessageReaction } from "@/lib/chat/message-reactions"
import { clerkDisplayName } from "@/lib/chat/messages"
import { authUserContext, getCurrentAdmin } from "@/lib/clerk-auth"

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const { id: messageId } = await params
  const demo = chatDemoContextFromRequest(request)
  const ctx = demo
    ? { userId: demo.userId, email: undefined as string | undefined, user: null }
    : await authUserContext(request)

  if (!ctx) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const emoji = typeof body.emoji === "string" ? body.emoji : ""
    if (!emoji) {
      return NextResponse.json({ error: "emoji is required" }, { status: 400 })
    }

    const admin = demo ? null : await getCurrentAdmin(request)
    const actorDisplayName = demo
      ? demo.displayName
      : clerkDisplayName(ctx.user!)

    const reaction = await toggleMessageReaction({
      messageId,
      emoji,
      clerkUserId: ctx.userId,
      email: ctx.email,
      isAdmin: Boolean(admin),
      actorDisplayName,
    })

    return NextResponse.json({ reaction })
  } catch (error) {
    console.error("[chat/reactions] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to react"
    const status =
      message === "Forbidden"
        ? 403
        : message.includes("not found") || message.includes("not allowed")
          ? 400
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
