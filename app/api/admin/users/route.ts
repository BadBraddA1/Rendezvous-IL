import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"
import { requireAdminApi, AdminRole } from "@/lib/clerk-auth"

// GET - List all users
export async function GET() {
  const adminCheck = await requireAdminApi()
  if (adminCheck instanceof NextResponse) return adminCheck

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
  const adminCheck = await requireAdminApi("admin") // Only admins can change roles
  if (adminCheck instanceof NextResponse) return adminCheck

  try {
    const { userId, role } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ["admin", "editor", "viewer", null]
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be admin, editor, viewer, or null" },
        { status: 400 }
      )
    }

    const clerk = await clerkClient()
    
    // Update user's public metadata with new role
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: role,
      },
    })

    return NextResponse.json({ success: true, role })
  } catch (error) {
    console.error("[Admin Users] Error updating user role:", error)
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    )
  }
}
