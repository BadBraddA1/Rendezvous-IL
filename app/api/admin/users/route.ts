import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"
import { requireAdminApi, requireFullAdminApi, AdminRole, isAdminRole, logAuditAction } from "@/lib/clerk-auth"

// GET - List all users
export async function GET() {
  try {
    await requireFullAdminApi()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const clerk = await clerkClient()
    const usersResponse = await clerk.users.getUserList({ limit: 100 })
    
    const users = usersResponse.data.map((user) => ({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || "",
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      role: (user.publicMetadata?.role as AdminRole) || null,
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error("[Admin Users] Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

// PATCH - Update user role
export async function PATCH(request: Request) {
  let admin
  try {
    admin = await requireFullAdminApi()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { userId, role } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Validate role
    if (role !== null && !isAdminRole(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be admin, editor, viewer, checkin, or null" },
        { status: 400 }
      )
    }

    const clerk = await clerkClient()
    const targetUser = await clerk.users.getUser(userId)
    const previousRole = (targetUser.publicMetadata?.role as AdminRole | undefined) ?? null
    const targetEmail = targetUser.emailAddresses[0]?.emailAddress || ""

    // Update user's public metadata with new role
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: role,
      },
    })

    await logAuditAction(
      "update_user_role",
      "admin_user",
      undefined,
      {
        target_email: targetEmail,
        user_id: userId,
        from: { role: previousRole },
        to: { role: role ?? null },
      },
      request,
    )

    return NextResponse.json({ success: true, role })
  } catch (error) {
    console.error("[Admin Users] Error updating user role:", error)
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    )
  }
}
