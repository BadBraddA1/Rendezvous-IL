import { NextResponse } from "next/server"
import { clerkClient, type User } from "@clerk/nextjs/server"
import {
  requireFullAdminApi,
  AdminRole,
  isAdminRole,
  logAuditAction,
} from "@/lib/clerk-auth"
import { getUserActivityMap, deleteUserActivity } from "@/lib/user-activity"

async function fetchAllClerkUsers(clerk: Awaited<ReturnType<typeof clerkClient>>) {
  const users: User[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await clerk.users.getUserList({ limit, offset, orderBy: "-created_at" })
    users.push(...response.data)
    if (response.data.length < limit) break
    offset += limit
    if (offset > 2000) break
  }

  return users
}

function serializeUser(
  user: User,
  activity?: {
    lastSeenAt: string
    lastPlatform: string
    lastAppVersion: string | null
    visitCount: number
  },
) {
  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress || "",
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    role: (user.publicMetadata?.role as AdminRole) || null,
    createdAt: user.createdAt,
    lastSignInAt: user.lastSignInAt,
    lastActiveAt: user.lastActiveAt ?? null,
    banned: Boolean(user.banned),
    locked: Boolean(user.locked),
    lastSeenAt: activity?.lastSeenAt ?? null,
    lastPlatform: activity?.lastPlatform ?? null,
    lastAppVersion: activity?.lastAppVersion ?? null,
    visitCount: activity?.visitCount ?? 0,
  }
}

// GET - List all users
export async function GET() {
  try {
    await requireFullAdminApi()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const clerk = await clerkClient()
    const clerkUsers = await fetchAllClerkUsers(clerk)
    const activityMap = await getUserActivityMap(clerkUsers.map((user) => user.id))

    const users = clerkUsers.map((user) => {
      const activity = activityMap.get(user.id)
      return serializeUser(user, activity)
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error("[Admin Users] Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

// POST - Create user
export async function POST(request: Request) {
  let admin
  try {
    admin = await requireFullAdminApi()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : undefined
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : undefined
    const password = typeof body.password === "string" ? body.password : undefined
    const role = body.role === null || body.role === "none" ? null : body.role

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    if (role !== null && !isAdminRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    if (password && password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const clerk = await clerkClient()
    const created = await clerk.users.createUser({
      emailAddress: [email],
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      password: password || undefined,
      skipPasswordRequirement: !password,
      publicMetadata: role ? { role } : {},
    })

    await logAuditAction(
      "create_user",
      "admin_user",
      undefined,
      {
        target_email: email,
        user_id: created.id,
        role: role ?? null,
        created_by: admin.email,
      },
      request,
    )

    return NextResponse.json({ success: true, user: serializeUser(created) })
  } catch (error) {
    console.error("[Admin Users] Error creating user:", error)
    const message = error instanceof Error ? error.message : "Failed to create user"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH - Update user role and/or ban status
export async function PATCH(request: Request) {
  let admin
  try {
    admin = await requireFullAdminApi()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { userId, role, banned, firstName, lastName } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    if (userId === admin.id && banned === true) {
      return NextResponse.json({ error: "You cannot ban your own account" }, { status: 400 })
    }

    const clerk = await clerkClient()
    const targetUser = await clerk.users.getUser(userId)
    const targetEmail = targetUser.emailAddresses[0]?.emailAddress || ""
    const auditDetails: Record<string, unknown> = {
      target_email: targetEmail,
      user_id: userId,
    }

    if ("role" in body) {
      if (role !== null && !isAdminRole(role)) {
        return NextResponse.json(
          { error: "Invalid role. Must be admin, editor, viewer, checkin, or null" },
          { status: 400 },
        )
      }

      if (userId === admin.id && role !== "admin") {
        return NextResponse.json({ error: "You cannot remove your own admin role" }, { status: 400 })
      }

      const previousRole = (targetUser.publicMetadata?.role as AdminRole | undefined) ?? null
      const existingMetadata = (targetUser.publicMetadata ?? {}) as Record<string, unknown>
      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...existingMetadata,
          role,
        },
      })
      auditDetails.from = { role: previousRole }
      auditDetails.to = { role: role ?? null }

      await logAuditAction("update_user_role", "admin_user", undefined, auditDetails, request)
    }

    if (typeof firstName === "string" || typeof lastName === "string") {
      await clerk.users.updateUser(userId, {
        ...(typeof firstName === "string" ? { firstName: firstName.trim() || undefined } : {}),
        ...(typeof lastName === "string" ? { lastName: lastName.trim() || undefined } : {}),
      })
      await logAuditAction(
        "update_user_profile",
        "admin_user",
        undefined,
        { target_email: targetEmail, user_id: userId, firstName, lastName },
        request,
      )
    }

    if (typeof banned === "boolean") {
      if (banned) {
        await clerk.users.banUser(userId)
      } else {
        await clerk.users.unbanUser(userId)
      }

      await logAuditAction(
        banned ? "ban_user" : "unban_user",
        "admin_user",
        undefined,
        { target_email: targetEmail, user_id: userId },
        request,
      )
    }

    const updated = await clerk.users.getUser(userId)
    const activityMap = await getUserActivityMap([userId])
    return NextResponse.json({
      success: true,
      user: serializeUser(updated, activityMap.get(userId)),
    })
  } catch (error) {
    console.error("[Admin Users] Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}
