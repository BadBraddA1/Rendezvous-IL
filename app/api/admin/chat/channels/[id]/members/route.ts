import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { getAdminPermissions } from "@/lib/admin-permissions"
import {
  addChatChannelMember,
  listChatChannelMemberIds,
  removeChatChannelMember,
} from "@/lib/chat/channels"
import { logAuditAction } from "@/lib/admin-auth"

type Params = { params: Promise<{ id: string }> }

async function memberDetails(clerkUserIds: string[]) {
  if (clerkUserIds.length === 0) return []

  const clerk = await clerkClient()
  const members = await Promise.all(
    clerkUserIds.map(async (id) => {
      try {
        const user = await clerk.users.getUser(id)
        const displayName =
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
          user.emailAddresses[0]?.emailAddress ||
          id
        return {
          id,
          displayName,
          email: user.emailAddresses[0]?.emailAddress || "",
          imageUrl: user.imageUrl,
        }
      } catch {
        return {
          id,
          displayName: id,
          email: "",
          imageUrl: "",
        }
      }
    }),
  )
  return members
}

export async function GET(_request: Request, { params }: Params) {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const { id: channelId } = await params
  try {
    const ids = await listChatChannelMemberIds(channelId)
    const members = await memberDetails(ids)
    return NextResponse.json({ members })
  } catch (error) {
    console.error("[admin/chat/members] GET error:", error)
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: Params) {
  const admin = await checkAdminAuth()
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Edit access required" }, { status: 403 })
  }

  const { id: channelId } = await params
  try {
    const body = await request.json()
    const clerkUserId = typeof body.clerk_user_id === "string" ? body.clerk_user_id : ""
    await addChatChannelMember(channelId, clerkUserId)
    await logAuditAction(admin.email, "chat_channel_member_added", "chat_channel", undefined, {
      channelId,
      clerkUserId,
    })
    const ids = await listChatChannelMemberIds(channelId)
    const members = await memberDetails(ids)
    return NextResponse.json({ members })
  } catch (error) {
    console.error("[admin/chat/members] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to add member"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const admin = await checkAdminAuth()
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Edit access required" }, { status: 403 })
  }

  const { id: channelId } = await params
  try {
    const body = await request.json().catch(() => ({}))
    const { searchParams } = new URL(request.url)
    const clerkUserId =
      (typeof body.clerk_user_id === "string" ? body.clerk_user_id : "") ||
      searchParams.get("clerk_user_id") ||
      ""
    await removeChatChannelMember(channelId, clerkUserId)
    await logAuditAction(admin.email, "chat_channel_member_removed", "chat_channel", undefined, {
      channelId,
      clerkUserId,
    })
    const ids = await listChatChannelMemberIds(channelId)
    const members = await memberDetails(ids)
    return NextResponse.json({ members })
  } catch (error) {
    console.error("[admin/chat/members] DELETE error:", error)
    const message = error instanceof Error ? error.message : "Failed to remove member"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
