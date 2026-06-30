import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"
import { requireFullAdminApi, logAuditAction } from "@/lib/clerk-auth"
import { deleteUserActivity } from "@/lib/user-activity"

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(request: Request, context: RouteContext) {
  let admin
  try {
    admin = await requireFullAdminApi()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: userId } = await context.params
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  if (userId === admin.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 })
  }

  try {
    const clerk = await clerkClient()
    const targetUser = await clerk.users.getUser(userId)
    const targetEmail = targetUser.emailAddresses[0]?.emailAddress || ""

    await clerk.users.deleteUser(userId)
    await deleteUserActivity(userId)

    await logAuditAction(
      "delete_user",
      "admin_user",
      undefined,
      { target_email: targetEmail, user_id: userId },
      request,
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Admin Users] Error deleting user:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
