import { NextResponse } from "next/server"
import { chatDemoContextFromRequest } from "@/lib/chat/demo"
import { uploadChatPhoto, validateChatPhoto } from "@/lib/chat/photo-storage"
import { authUserContext } from "@/lib/clerk-auth"

type Params = { params: Promise<{ id: string }> }

/**
 * Upload a single chat photo. Clients upload one-at-a-time then POST the message
 * with image_urls JSON — avoids Vercel's ~4.5 MB multipart body limit (413).
 */
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
    const form = await request.formData()
    const file = form.get("photo")
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "Photo required" }, { status: 400 })
    }

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

    return NextResponse.json({ url })
  } catch (error) {
    console.error("[chat/photos] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to upload photo"
    const status =
      message.includes("configured") || message.includes("required") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
