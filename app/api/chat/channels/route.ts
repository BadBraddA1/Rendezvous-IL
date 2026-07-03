import { NextResponse } from "next/server"
import { listMemberChatChannels } from "@/lib/chat/channels"
import { authUserContext, getCurrentAdmin } from "@/lib/clerk-auth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const ctx = await authUserContext(request)
  if (!ctx) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    const admin = await getCurrentAdmin(request)
    const channels = await listMemberChatChannels(ctx.userId, ctx.email, Boolean(admin))
    return NextResponse.json({
      channels,
      meta: {
        email: ctx.email ?? null,
        isAdmin: Boolean(admin),
        channelCount: channels.length,
      },
    })
  } catch (error) {
    console.error("[chat/channels] GET error:", error)
    return NextResponse.json({ error: "Failed to load chat channels" }, { status: 500 })
  }
}
