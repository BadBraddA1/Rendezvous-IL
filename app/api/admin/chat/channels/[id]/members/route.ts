import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"
import { checkAdminAuth, logAuditAction } from "@/lib/admin-auth"
import { getAdminPermissions } from "@/lib/admin-permissions"
import {
  addChatChannelMember,
  listChatChannelMembers,
  removeChatChannelMember,
  setChatChannelMemberRole,
  type ChatMemberRole,
} from "@/lib/chat/channels"

type Params = { params: Promise<{ id: string }> }

async function memberDetails(members: { clerk_user_id: string; role: ChatMemberRole }[]) {
  if (members.length === 0) return []

  const clerk = await clerkClient()
  return Promise.all(
    members.map(async (member) => {
      try {
        const user = await clerk.users.getUser(member.clerk_user_id)
        const displayName =
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
          user.emailAddresses[0]?.emailAddress ||
          member.clerk_user_id
        return {
          id: member.clerk_user_id,
          displayName,
          email: user.emailAddresses[0]?.emailAddress || "",
          imageUrl: user.imageUrl,
          role: member.role,
        }
      } catch {
        return {
          id: member.clerk_user_id,
          displayName: member.clerk_user_id,
          email: "",
          imageUrl: "",
          role: member.role,
        }
      }
    }),
  )
}

async function loadMembers(channelId: string) {
  const members = await listChatChannelMembers(channelId)
  return memberDetails(members)
}

export async function GET(_request: Request, { params }: Params) {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const { id: channelId } = await params
  try {
    const members = await loadMembers(channelId)
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
    const role: ChatMemberRole = body.role === "moderator" ? "moderator" : "member"
    await addChatChannelMember(channelId, clerkUserId, role)
    await logAuditAction(admin.email, "chat_channel_member_added", "chat_channel", undefined, {
      channelId,
      clerkUserId,
      role,
    })
    const members = await loadMembers(channelId)
    return NextResponse.json({ members })
  } catch (error) {
    console.error("[admin/chat/members] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to add member"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const admin = await checkAdminAuth()
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Edit access required" }, { status: 403 })
  }

  const { id: channelId } = await params
  try {
    const body = await request.json()
    const clerkUserId = typeof body.clerk_user_id === "string" ? body.clerk_user_id : ""
    const role: ChatMemberRole = body.role === "moderator" ? "moderator" : "member"
    await setChatChannelMemberRole(channelId, clerkUserId, role)
    await logAuditAction(admin.email, "chat_channel_member_role", "chat_channel", undefined, {
      channelId,
      clerkUserId,
      role,
    })
    const members = await loadMembers(channelId)
    return NextResponse.json({ members })
  } catch (error) {
    console.error("[admin/chat/members] PATCH error:", error)
    const message = error instanceof Error ? error.message : "Failed to update member"
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
    const members = await loadMembers(channelId)
    return NextResponse.json({ members })
  } catch (error) {
    console.error("[admin/chat/members] DELETE error:", error)
    const message = error instanceof Error ? error.message : "Failed to remove member"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
