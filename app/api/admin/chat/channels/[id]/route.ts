import { NextResponse } from "next/server"
import { deleteCustomChatChannel, updateChatChannel } from "@/lib/chat/channels"
import { checkAdminAuth, logAuditAction } from "@/lib/admin-auth"
import { getAdminPermissions } from "@/lib/admin-permissions"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const { id: channelId } = await params
  const admin = await checkAdminAuth()
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Edit access required" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const channel = await updateChatChannel(channelId, {
      name: typeof body.name === "string" ? body.name : undefined,
      description:
        body.description === null || typeof body.description === "string"
          ? body.description
          : undefined,
      is_active: typeof body.is_active === "boolean" ? body.is_active : undefined,
      is_test: typeof body.is_test === "boolean" ? body.is_test : undefined,
    })

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    await logAuditAction(admin.email, "chat_channel_updated", "chat_channel", undefined, {
      channelId,
    })

    return NextResponse.json({ channel })
  } catch (error) {
    console.error("[admin/chat/channels/id] PATCH error:", error)
    const message = error instanceof Error ? error.message : "Failed to update channel"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id: channelId } = await params
  const admin = await checkAdminAuth()
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Edit access required" }, { status: 403 })
  }

  try {
    const deleted = await deleteCustomChatChannel(channelId)
    if (!deleted) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    await logAuditAction(admin.email, "chat_channel_deleted", "chat_channel", undefined, {
      channelId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[admin/chat/channels/id] DELETE error:", error)
    const message = error instanceof Error ? error.message : "Failed to delete channel"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
