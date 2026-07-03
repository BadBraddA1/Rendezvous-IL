import { NextResponse } from "next/server"
import { deleteChannelMessage } from "@/lib/chat/messages"
import { authUserId, getCurrentAdmin } from "@/lib/clerk-auth"

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, { params }: Params) {
  const { id: messageId } = await params
  const userId = await authUserId()
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    const admin = await getCurrentAdmin()
    const deleted = await deleteChannelMessage({
      messageId,
      clerkUserId: userId,
      isAdmin: Boolean(admin),
    })

    if (!deleted) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[chat/messages/delete] error:", error)
    const message = error instanceof Error ? error.message : "Failed to delete message"
    const status = message === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
