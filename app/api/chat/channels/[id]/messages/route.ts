import { NextResponse } from "next/server"
import { listChannelMessages, sendChannelMessage, clerkDisplayName } from "@/lib/chat/messages"
import { userCanModerateChannel } from "@/lib/chat/channels"
import { chatDemoContextFromRequest } from "@/lib/chat/demo"
import { uploadChatPhoto, validateChatPhoto } from "@/lib/chat/photo-storage"
import { authUserContext, getCurrentAdmin } from "@/lib/clerk-auth"

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const { id: channelId } = await params
  const demo = chatDemoContextFromRequest(request)
  const ctx = demo
    ? { userId: demo.userId, email: undefined as string | undefined, user: null }
    : await authUserContext(request)

  if (!ctx) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get("cursor")
  const limit = Number(searchParams.get("limit") ?? 50)

  try {
    const admin = demo ? null : await getCurrentAdmin(request)
    const canModerate = demo
      ? false
      : await userCanModerateChannel(channelId, ctx.userId, Boolean(admin))

    const result = await listChannelMessages(channelId, {
      clerkUserId: ctx.userId,
      email: ctx.email,
      isAdmin: Boolean(admin),
      cursor,
      limit,
    })

    return NextResponse.json({ ...result, can_moderate: canModerate })
  } catch (error) {
    console.error("[chat/messages] GET error:", error)
    const message = error instanceof Error ? error.message : "Failed to load messages"
    const status = message === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request, { params }: Params) {
  const { id: channelId } = await params
  const demo = chatDemoContextFromRequest(request)
  const ctx = demo
    ? { userId: demo.userId, email: undefined as string | undefined, user: null }
    : await authUserContext(request)

  if (!ctx) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    const contentType = request.headers.get("content-type") || ""
    let text = ""
    let isAnnouncement = false
    let imageUrl: string | null = null

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      text = typeof form.get("body") === "string" ? String(form.get("body")) : ""
      isAnnouncement = String(form.get("is_announcement") || "") === "true"
      const file = form.get("photo")
      if (file instanceof File) {
        const validationError = validateChatPhoto(file)
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 })
        }
        imageUrl = await uploadChatPhoto(
          channelId,
          ctx.userId,
          await file.arrayBuffer(),
          file.type,
        )
      }
    } else {
      const body = await request.json()
      text = typeof body.body === "string" ? body.body : ""
      isAnnouncement = Boolean(body.is_announcement)
      if (typeof body.image_url === "string" && body.image_url.trim()) {
        imageUrl = body.image_url.trim()
      }
    }

    // Demo may not post announcements.
    if (demo) isAnnouncement = false

    const admin = demo ? null : await getCurrentAdmin(request)
    const displayName = demo
      ? demo.displayName
      : clerkDisplayName(ctx.user!)
    const avatarUrl = demo ? null : ctx.user?.imageUrl

    const message = await sendChannelMessage({
      channelId,
      body: text,
      imageUrl,
      clerkUserId: ctx.userId,
      email: ctx.email,
      isAdmin: Boolean(admin),
      displayName,
      avatarUrl,
      isAnnouncement,
    })

    return NextResponse.json({ message })
  } catch (error) {
    console.error("[chat/messages] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to send message"
    const status =
      message === "Forbidden"
        ? 403
        : message.includes("required") || message.includes("long") || message.includes("configured")
          ? 400
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
