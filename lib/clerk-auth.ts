import { auth, currentUser } from "@clerk/nextjs/server"

export type AdminRole = "admin" | "editor" | "viewer" | "checkin"

export const ADMIN_ROLES: AdminRole[] = ["admin", "editor", "viewer", "checkin"]

export interface AdminUser {
  id: string
  email: string
  fullName: string
  role: AdminRole
}

export interface AdminPermissions {
  canViewDashboard: boolean
  canViewRegistrations: boolean
  canCheckIn: boolean
  canEdit: boolean
  canManageUsers: boolean
}

export function isAdminRole(role: string | undefined | null): role is AdminRole {
  return !!role && ADMIN_ROLES.includes(role as AdminRole)
}

export function getAdminPermissions(role: AdminRole): AdminPermissions {
  switch (role) {
    case "admin":
      return {
        canViewDashboard: true,
        canViewRegistrations: true,
        canCheckIn: true,
        canEdit: true,
        canManageUsers: true,
      }
    case "editor":
      return {
        canViewDashboard: true,
        canViewRegistrations: true,
        canCheckIn: true,
        canEdit: true,
        canManageUsers: false,
      }
    case "viewer":
      return {
        canViewDashboard: true,
        canViewRegistrations: true,
        canCheckIn: false,
        canEdit: false,
        canManageUsers: false,
      }
    case "checkin":
      return {
        canViewDashboard: true,
        canViewRegistrations: false,
        canCheckIn: true,
        canEdit: false,
        canManageUsers: false,
      }
  }
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

  const publicMetadata = user.publicMetadata as { role?: string } | undefined
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
  const user = await currentUser()

  if (!user) {
    return null
  }

  const publicMetadata = user.publicMetadata as { role?: string } | undefined
  const role = publicMetadata?.role

  if (!isAdminRole(role)) {
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
 * Check if role can edit (editor or admin)
 */
export function canEdit(role: AdminRole | null): boolean {
  return !!role && getAdminPermissions(role).canEdit
}

/**
 * Check if role can run check-in
 */
export function canCheckIn(role: AdminRole | null): boolean {
  return !!role && getAdminPermissions(role).canCheckIn
}

/**
 * Check if role is full admin
 */
export function isFullAdmin(role: AdminRole | null): boolean {
  return role === "admin"
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
