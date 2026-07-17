import { NextResponse } from "next/server"
import { listChannelMessages, sendChannelMessage, clerkDisplayName } from "@/lib/chat/messages"
import { userCanModerateChannel } from "@/lib/chat/channels"
import { chatDemoContextFromRequest } from "@/lib/chat/demo"
import { uploadChatPhoto, validateChatPhoto } from "@/lib/chat/photo-storage"
import { MAX_CHAT_PHOTOS_PER_MESSAGE } from "@/lib/chat/reactions"
import { markChannelRead } from "@/lib/chat/reads"
import { authUserContext, getCurrentAdmin } from "@/lib/clerk-auth"

type Params = { params: Promise<{ id: string }> }

function collectPhotoFiles(form: FormData): File[] {
  const files: File[] = []
  for (const [key, value] of form.entries()) {
    if ((key === "photo" || key === "photos" || key === "photos[]") && value instanceof File) {
      if (value.size > 0) files.push(value)
    }
  }
  return files.slice(0, MAX_CHAT_PHOTOS_PER_MESSAGE)
}

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

    // Opening the thread clears the unread badge for this channel.
    await markChannelRead(channelId, ctx.userId)

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
    let imageUrls: string[] = []
    let kind: "text" | "poll" = "text"
    let pollQuestion: string | null = null
    let pollOptions: string[] | null = null

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      text = typeof form.get("body") === "string" ? String(form.get("body")) : ""
      isAnnouncement = String(form.get("is_announcement") || "") === "true"
      if (String(form.get("kind") || "") === "poll") kind = "poll"
      if (typeof form.get("poll_question") === "string") {
        pollQuestion = String(form.get("poll_question"))
      }
      const optionsRaw = form.get("poll_options")
      if (typeof optionsRaw === "string" && optionsRaw.trim()) {
        try {
          const parsed = JSON.parse(optionsRaw) as unknown
          if (Array.isArray(parsed)) {
            pollOptions = parsed.filter((o): o is string => typeof o === "string")
          }
        } catch {
          // ignore
        }
      }

      const files = collectPhotoFiles(form)
      for (const file of files) {
        const validationError = validateChatPhoto(file)
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 })
        }
        const url = await uploadChatPhoto(
          channelId,
          ctx.userId,
          await file.arrayBuffer(),
          file.type,
        )
        imageUrls.push(url)
      }
    } else {
      const body = await request.json()
      text = typeof body.body === "string" ? body.body : ""
      isAnnouncement = Boolean(body.is_announcement)
      if (body.kind === "poll") kind = "poll"
      if (typeof body.poll_question === "string") pollQuestion = body.poll_question
      if (Array.isArray(body.poll_options)) {
        pollOptions = body.poll_options.filter((o: unknown): o is string => typeof o === "string")
      }
      if (Array.isArray(body.image_urls)) {
        imageUrls = body.image_urls
          .filter((u: unknown): u is string => typeof u === "string" && u.trim().length > 0)
          .slice(0, MAX_CHAT_PHOTOS_PER_MESSAGE)
      } else if (typeof body.image_url === "string" && body.image_url.trim()) {
        imageUrls = [body.image_url.trim()]
      }
    }

    // Demo may not post announcements or polls.
    if (demo) {
      isAnnouncement = false
      if (kind === "poll") {
        return NextResponse.json({ error: "Demo cannot create polls" }, { status: 403 })
      }
    }

    const admin = demo ? null : await getCurrentAdmin(request)
    const displayName = demo ? demo.displayName : clerkDisplayName(ctx.user!)
    const avatarUrl = demo ? null : ctx.user?.imageUrl

    const message = await sendChannelMessage({
      channelId,
      body: text,
      imageUrls,
      clerkUserId: ctx.userId,
      email: ctx.email,
      isAdmin: Boolean(admin),
      displayName,
      avatarUrl,
      isAnnouncement,
      kind,
      pollQuestion,
      pollOptions,
    })

    return NextResponse.json({ message })
  } catch (error) {
    console.error("[chat/messages] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to send message"
    const status =
      message === "Forbidden"
        ? 403
        : message.includes("required") ||
            message.includes("long") ||
            message.includes("configured") ||
            message.includes("need at least") ||
            message.includes("Only admins")
          ? 400
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
