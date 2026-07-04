import {
  auth,
  clerkClient,
  currentUser,
  verifyToken,
  type User,
} from "@clerk/nextjs/server"
import { headers as nextHeaders } from "next/headers"
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

function bearerFromAuthorizationHeader(header: string | null): string | null {
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

function bearerTokenFromRequest(request?: Request): string | null {
  if (!request) return null
  return bearerFromAuthorizationHeader(
    request.headers.get("authorization") || request.headers.get("Authorization"),
  )
}

/**
 * When handlers call getCurrentAdmin() without the Request, auth() alone is flaky
 * for mobile Bearer tokens. Rebuild a minimal Request from Next.js headers so
 * authenticateRequest / verifyToken still run.
 */
async function requestForBearerAuth(request?: Request): Promise<Request | undefined> {
  if (request) return request

  try {
    const h = await nextHeaders()
    const authorization = h.get("authorization") || h.get("Authorization")
    if (!authorization) return undefined

    const headerInit: Record<string, string> = { Authorization: authorization }
    const cookie = h.get("cookie")
    if (cookie) headerInit.Cookie = cookie

    return new Request("https://rendezvousil.local/api/auth-context", {
      headers: headerInit,
    })
  } catch {
    // Outside a request scope (scripts, build) — no headers available.
    return undefined
  }
}

/**
 * Resolve Clerk user id from cookies and/or mobile Bearer session JWTs.
 * Tries auth(), authenticateRequest(), then verifyToken() so native apps work
 * even when Next.js auth() does not bind the Authorization header.
 */
export async function authUserId(request?: Request): Promise<string | null> {
  try {
    const session = await auth({ acceptsToken: "session_token" })
    if (session.userId) return session.userId
  } catch (error) {
    console.error("[clerk-auth] auth() failed:", error)
  }

  const authRequest = await requestForBearerAuth(request)
  if (authRequest) {
    try {
      const clerk = await clerkClient()
      const state = await clerk.authenticateRequest(authRequest, {
        acceptsToken: "session_token",
      })
      if (state.isAuthenticated) {
        const authObject = state.toAuth()
        if (authObject.userId) return authObject.userId
      }
    } catch (error) {
      console.error("[clerk-auth] authenticateRequest failed:", error)
    }

    const token = bearerTokenFromRequest(authRequest)
    if (token && process.env.CLERK_SECRET_KEY) {
      try {
        const payload = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY,
        })
        const sub = typeof payload.sub === "string" ? payload.sub : null
        if (sub) return sub
      } catch (error) {
        console.error("[clerk-auth] verifyToken failed:", error)
      }
    }
  }

  return null
}

/**
 * Load the Clerk user for an authenticated request.
 * `currentUser()` works for browser cookies but often returns null for mobile Bearer
 * session tokens — fall back to the Backend API in that case.
 */
export async function resolveClerkUser(userId: string): Promise<User | null> {
  try {
    const fromSession = await currentUser()
    if (fromSession && fromSession.id === userId) {
      return fromSession
    }
  } catch {
    // ignore — mobile Bearer path usually has no session cookie
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
export async function authUserContext(request?: Request): Promise<AuthUserContext | null> {
  const userId = await authUserId(request)
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
export async function getAdminRole(request?: Request): Promise<AdminRole | null> {
  const ctx = await authUserContext(request)
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
export async function getCurrentAdmin(request?: Request): Promise<AdminUser | null> {
  const ctx = await authUserContext(request)
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
export async function isAuthenticated(request?: Request): Promise<boolean> {
  const userId = await authUserId(request)
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
export async function requireAdminApi(request?: Request): Promise<AdminUser> {
  const admin = await getCurrentAdmin(request)

  if (!admin) {
    throw new Error("Unauthorized - admin access required")
  }

  return admin
}

/**
 * Require full admin for user-management APIs
 */
export async function requireFullAdminApi(request?: Request): Promise<AdminUser> {
  const admin = await requireAdminApi(request)
  if (!getAdminPermissions(admin.role).canManageUsers) {
    throw new Error("Unauthorized - full admin access required")
  }
  return admin
}

/**
 * Require check-in permission for station APIs
 */
export async function requireCheckInApi(request?: Request): Promise<AdminUser> {
  const admin = await getCurrentAdmin(request)
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
  const admin = await getCurrentAdmin(request)

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
