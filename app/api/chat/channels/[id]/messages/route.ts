import { NextResponse } from "next/server"
import { listChannelMessages, sendChannelMessage, clerkDisplayName } from "@/lib/chat/messages"
import { authUserContext, getCurrentAdmin } from "@/lib/clerk-auth"

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const { id: channelId } = await params
  const ctx = await authUserContext(request)
  if (!ctx) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get("cursor")
  const limit = Number(searchParams.get("limit") ?? 50)

  try {
    const admin = await getCurrentAdmin(request)

    const result = await listChannelMessages(channelId, {
      clerkUserId: ctx.userId,
      email: ctx.email,
      isAdmin: Boolean(admin),
      cursor,
      limit,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[chat/messages] GET error:", error)
    const message = error instanceof Error ? error.message : "Failed to load messages"
    const status = message === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request, { params }: Params) {
  const { id: channelId } = await params
  const ctx = await authUserContext(request)
  if (!ctx) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const text = typeof body.body === "string" ? body.body : ""
    const isAnnouncement = Boolean(body.is_announcement)

    const admin = await getCurrentAdmin(request)
    if (isAnnouncement && !admin) {
      return NextResponse.json({ error: "Admin required for announcements" }, { status: 403 })
    }

    const message = await sendChannelMessage({
      channelId,
      body: text,
      clerkUserId: ctx.userId,
      email: ctx.email,
      isAdmin: Boolean(admin),
      displayName: clerkDisplayName(ctx.user),
      avatarUrl: ctx.user.imageUrl,
      isAnnouncement,
    })

    return NextResponse.json({ message })
  } catch (error) {
    console.error("[chat/messages] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to send message"
    const status =
      message === "Forbidden" ? 403 : message.includes("required") || message.includes("long") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
