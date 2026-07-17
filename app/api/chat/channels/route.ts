import { NextResponse } from "next/server"
import { listMemberChatChannels, userCanModerateChannel } from "@/lib/chat/channels"
import { chatDemoContextFromRequest, listDemoTestChannels } from "@/lib/chat/demo"
import { attachUnreadCountsAndSort } from "@/lib/chat/reads"
import { authUserContext, getCurrentAdmin } from "@/lib/clerk-auth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const demo = chatDemoContextFromRequest(request)
  if (demo) {
    try {
      const channels = await listDemoTestChannels()
      const withUnread = await attachUnreadCountsAndSort(channels, demo.userId)
      const enriched = withUnread.map((channel) => ({
        ...channel,
        can_moderate: false,
      }))
      return NextResponse.json({
        channels: enriched,
        meta: {
          email: null,
          isAdmin: false,
          isDemo: true,
          channelCount: enriched.length,
        },
      })
    } catch (error) {
      console.error("[chat/channels] demo GET error:", error)
      return NextResponse.json({ error: "Failed to load chat channels" }, { status: 500 })
    }
  }

  const ctx = await authUserContext(request)
  if (!ctx) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    const admin = await getCurrentAdmin(request)
    const channels = await listMemberChatChannels(ctx.userId, ctx.email, Boolean(admin))
    const withUnread = await attachUnreadCountsAndSort(channels, ctx.userId)
    const enriched = await Promise.all(
      withUnread.map(async (channel) => ({
        ...channel,
        can_moderate: await userCanModerateChannel(channel.id, ctx.userId, Boolean(admin)),
      })),
    )
    return NextResponse.json({
      channels: enriched,
      meta: {
        email: ctx.email ?? null,
        isAdmin: Boolean(admin),
        channelCount: enriched.length,
      },
    })
  } catch (error) {
    console.error("[chat/channels] GET error:", error)
    return NextResponse.json({ error: "Failed to load chat channels" }, { status: 500 })
  }
}
