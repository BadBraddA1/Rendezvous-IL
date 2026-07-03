import { NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { listMemberChatChannels } from "@/lib/chat/channels"
import { authUserId, getCurrentAdmin } from "@/lib/clerk-auth"

export const dynamic = "force-dynamic"

export async function GET() {
  const userId = await authUserId()
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    const user = await currentUser()
    const email = user?.emailAddresses?.[0]?.emailAddress
    const admin = await getCurrentAdmin()
    const channels = await listMemberChatChannels(userId, email, Boolean(admin))
    return NextResponse.json({ channels })
  } catch (error) {
    console.error("[chat/channels] GET error:", error)
    return NextResponse.json({ error: "Failed to load chat channels" }, { status: 500 })
  }
}
