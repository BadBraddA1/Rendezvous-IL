import { auth, currentUser } from "@clerk/nextjs/server"

export type AdminRole = "admin" | "editor" | "viewer"

export interface AdminUser {
  id: string
  email: string
  fullName: string
  role: AdminRole
}

/**
 * Get the current user's admin role from Clerk metadata
 * Returns null if user is not an admin
 */
export async function getAdminRole(): Promise<AdminRole | null> {
  const user = await currentUser()
  
  if (!user) {
    return null
  }

  // Check for role in public metadata (set via Clerk Dashboard or API)
  const publicMetadata = user.publicMetadata as { role?: string } | undefined
  const role = publicMetadata?.role as AdminRole | undefined

  if (!role || !["admin", "editor", "viewer"].includes(role)) {
    return null
  }

  return role
}

/**
 * Get current admin user details
 * Returns null if not authenticated or not an admin
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const user = await currentUser()
  
  if (!user) {
    return null
  }

  const publicMetadata = user.publicMetadata as { role?: string } | undefined
  const role = publicMetadata?.role as AdminRole | undefined

  if (!role || !["admin", "editor", "viewer"].includes(role)) {
    return null
  }

  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress || "",
    fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    role,
  }
}

/**
 * Check if current user is authenticated (but may not be admin)
 */
export async function isAuthenticated(): Promise<boolean> {
  const { userId } = await auth()
  return !!userId
}

/**
 * Require editor or admin role for mutations
 */
export async function requireEditor(role: AdminRole) {
  if (role === "viewer") {
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
 * Check if role can edit (editor or admin)
 */
export function canEdit(role: AdminRole | null): boolean {
  return role === "admin" || role === "editor"
}

/**
 * Check if role is full admin
 */
export function isFullAdmin(role: AdminRole | null): boolean {
  return role === "admin"
}

/**
 * Require admin access for API routes
 * Returns admin info or throws an error (for use in route handlers)
 */
export async function requireAdminApi(): Promise<AdminUser> {
  const admin = await getCurrentAdmin()

  if (!admin) {
    throw new Error("Unauthorized - admin access required")
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
  details?: Record<string, unknown>
) {
  const admin = await getCurrentAdmin()

  if (!admin) {
    console.error("[Audit] Attempted to log action without admin context")
    return
  }

  console.log("[Audit]", {
    timestamp: new Date().toISOString(),
    adminId: admin.id,
    adminEmail: admin.email,
    role: admin.role,
    action,
    resourceType,
    resourceId,
    details,
  })
}
