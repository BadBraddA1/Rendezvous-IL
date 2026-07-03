import { auth, clerkClient, currentUser, type User } from "@clerk/nextjs/server"
import {
  type AdminRole,
  type AdminPermissions,
  type AdminUser,
  canCheckIn,
  canEdit,
  getAdminPermissions,
  isAdminRole,
  isFullAdmin,
} from "@/lib/admin-permissions"

export type { AdminRole, AdminPermissions, AdminUser }

export { ADMIN_ROLES, canCheckIn, canEdit, getAdminPermissions, isAdminRole, isFullAdmin } from "@/lib/admin-permissions"

export type AuthUserContext = {
  userId: string
  email: string | undefined
  user: User
}

/**
 * Auth that accepts both browser cookies and native Bearer session tokens (iOS/Android).
 * Use this in any API route the mobile apps call.
 */
export async function authUserId(): Promise<string | null> {
  const { userId } = await auth({ acceptsToken: "session_token" })
  return userId
}

/**
 * Load the Clerk user for an authenticated request.
 * `currentUser()` works for browser cookies but often returns null for mobile Bearer
 * session tokens — fall back to the Backend API in that case.
 */
export async function resolveClerkUser(userId: string): Promise<User | null> {
  const fromSession = await currentUser()
  if (fromSession && fromSession.id === userId) {
    return fromSession
  }

  try {
    const clerk = await clerkClient()
    return await clerk.users.getUser(userId)
  } catch (error) {
    console.error("[clerk-auth] resolveClerkUser failed:", error)
    return null
  }
}

/** Signed-in user id + email for member APIs (chat, directory, family). */
export async function authUserContext(): Promise<AuthUserContext | null> {
  const userId = await authUserId()
  if (!userId) return null

  const user = await resolveClerkUser(userId)
  if (!user) return null

  return {
    userId,
    email: user.emailAddresses[0]?.emailAddress,
    user,
  }
}

/**
 * Get the current user's admin role from Clerk metadata
 * Returns null if user is not an admin
 */
export async function getAdminRole(): Promise<AdminRole | null> {
  const ctx = await authUserContext()
  if (!ctx) return null

  const publicMetadata = ctx.user.publicMetadata as { role?: string } | undefined
  const role = publicMetadata?.role

  if (!isAdminRole(role)) {
    return null
  }

  return role
}

/**
 * Get current admin user details
 * Returns null if not authenticated or not an admin
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const ctx = await authUserContext()
  if (!ctx) return null

  const publicMetadata = ctx.user.publicMetadata as { role?: string } | undefined
  const role = publicMetadata?.role

  if (!isAdminRole(role)) {
    return null
  }

  return {
    id: ctx.userId,
    email: ctx.email || "",
    fullName: `${ctx.user.firstName || ""} ${ctx.user.lastName || ""}`.trim(),
    role,
  }
}

/**
 * Check if current user is authenticated (but may not be admin)
 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await authUserId()
  return !!userId
}

/**
 * Require editor or admin role for mutations
 */
export async function requireEditor(role: AdminRole) {
  if (!getAdminPermissions(role).canEdit) {
    throw new Error("Insufficient permissions - editor access required")
  }
  return role
}

/**
 * Require full admin role
 */
export async function requireFullAdmin(role: AdminRole) {
  if (role !== "admin") {
    throw new Error("Insufficient permissions - admin access required")
  }
  return role
}

/**
 * Require admin access for API routes
 */
export async function requireAdminApi(): Promise<AdminUser> {
  const admin = await getCurrentAdmin()

  if (!admin) {
    throw new Error("Unauthorized - admin access required")
  }

  return admin
}

/**
 * Require full admin for user-management APIs
 */
export async function requireFullAdminApi(): Promise<AdminUser> {
  const admin = await requireAdminApi()
  if (!getAdminPermissions(admin.role).canManageUsers) {
    throw new Error("Unauthorized - full admin access required")
  }
  return admin
}

/**
 * Require check-in permission for station APIs
 */
export async function requireCheckInApi(): Promise<AdminUser> {
  const admin = await getCurrentAdmin()
  if (!admin || !getAdminPermissions(admin.role).canCheckIn) {
    throw new Error("Unauthorized - check-in access required")
  }
  return admin
}

/**
 * Log an audit action for admin activities
 */
export async function logAuditAction(
  action: string,
  resourceType?: string,
  resourceId?: number,
  details?: Record<string, unknown>,
  request?: Request,
) {
  const admin = await getCurrentAdmin()

  if (!admin) {
    console.error("[Audit] Attempted to log action without admin context")
    return
  }

  const ipAddress =
    request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request?.headers.get("x-real-ip") ||
    undefined
  const userAgent = request?.headers.get("user-agent") || undefined

  const { writeAuditLog } = await import("@/lib/audit-log")
  await writeAuditLog({
    adminEmail: admin.email,
    action,
    resourceType,
    resourceId,
    details: { ...details, role: admin.role },
    ipAddress,
    userAgent,
  })
}
