import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  createCustomChatChannel,
  listAllChatChannelsForAdmin,
  setChatChannelMembers,
} from "@/lib/chat/channels"
import { checkAdminAuth, logAuditAction } from "@/lib/admin-auth"
import { getAdminPermissions } from "@/lib/admin-permissions"

export async function GET() {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  try {
    const channels = await listAllChatChannelsForAdmin()
    return NextResponse.json({ channels })
  } catch (error) {
    console.error("[admin/chat/channels] GET error:", error)
    return NextResponse.json({ error: "Failed to load channels" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const admin = await checkAdminAuth()
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Edit access required" }, { status: 403 })
  }

  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const name = typeof body.name === "string" ? body.name : ""
    const description = typeof body.description === "string" ? body.description : null
    const isTest = Boolean(body.is_test)
    const memberClerkIds = Array.isArray(body.member_clerk_ids)
      ? body.member_clerk_ids.filter((id: unknown) => typeof id === "string")
      : []

    const channel = await createCustomChatChannel({
      name,
      description,
      isTest,
      createdByClerkId: userId,
      memberClerkIds,
    })

    await logAuditAction(admin.email, "chat_channel_created", "chat_channel", undefined, {
      channelId: channel.id,
      name: channel.name,
      isTest,
    })

    return NextResponse.json({ channel })
  } catch (error) {
    console.error("[admin/chat/channels] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to create channel"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  const admin = await checkAdminAuth()
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Edit access required" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const channelId = typeof body.channel_id === "string" ? body.channel_id : ""
    const memberClerkIds = Array.isArray(body.member_clerk_ids)
      ? body.member_clerk_ids.filter((id: unknown) => typeof id === "string")
      : null

    if (!channelId) {
      return NextResponse.json({ error: "channel_id is required" }, { status: 400 })
    }

    if (memberClerkIds) {
      await setChatChannelMembers(channelId, memberClerkIds)
      await logAuditAction(admin.email, "chat_channel_members_updated", "chat_channel", undefined, {
        channelId,
        memberCount: memberClerkIds.length,
      })
    }

    const channels = await listAllChatChannelsForAdmin()
    const channel = channels.find((item) => item.id === channelId)
    return NextResponse.json({ channel })
  } catch (error) {
    console.error("[admin/chat/channels] PATCH error:", error)
    const message = error instanceof Error ? error.message : "Failed to update channel"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
