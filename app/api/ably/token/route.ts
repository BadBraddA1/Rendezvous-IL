import { NextResponse } from "next/server"
import { createChatAblyTokenRequest } from "@/lib/ably"
import { listMemberChatChannels } from "@/lib/chat/channels"
import { authUserContext, getCurrentAdmin } from "@/lib/clerk-auth"

export async function POST(request: Request) {
  const ctx = await authUserContext(request)
  if (!ctx) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    const admin = await getCurrentAdmin(request)
    const channels = await listMemberChatChannels(ctx.userId, ctx.email, Boolean(admin))
    const channelIds = channels.map((channel) => channel.id)

    if (channelIds.length === 0) {
      return NextResponse.json({ error: "No chat channels available" }, { status: 403 })
    }

    const tokenRequest = await createChatAblyTokenRequest(ctx.userId, channelIds)
    return NextResponse.json({ tokenRequest })
  } catch (error) {
    console.error("[ably/token] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to create Ably token"
    const status = message.includes("ABLY_API_KEY") ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
