import { NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { createChatAblyTokenRequest } from "@/lib/ably"
import { listMemberChatChannels } from "@/lib/chat/channels"
import { authUserId, getCurrentAdmin } from "@/lib/clerk-auth"

export async function POST() {
  const userId = await authUserId()
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    const user = await currentUser()
    const email = user?.emailAddresses?.[0]?.emailAddress
    const admin = await getCurrentAdmin()
    const channels = await listMemberChatChannels(userId, email, Boolean(admin))
    const channelIds = channels.map((channel) => channel.id)

    if (channelIds.length === 0) {
      return NextResponse.json({ error: "No chat channels available" }, { status: 403 })
    }

    const tokenRequest = await createChatAblyTokenRequest(userId, channelIds)
    return NextResponse.json({ tokenRequest })
  } catch (error) {
    console.error("[ably/token] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to create Ably token"
    const status = message.includes("ABLY_API_KEY") ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
