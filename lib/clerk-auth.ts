import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export type AdminRole = "admin" | "editor" | "viewer"

/**
 * Get the current user's admin role from Clerk metadata
 * Returns null if user is not an admin
 */
export async function getAdminRole(): Promise<AdminRole | null> {
  const { userId, sessionClaims } = await auth()

  if (!userId) {
    return null
  }

  // Check for role in public metadata
  const role = sessionClaims?.metadata?.role as AdminRole | undefined

  if (!role || !["admin", "editor", "viewer"].includes(role)) {
    return null
  }

  return role
}

/**
 * Get current admin user details
 * Returns null if not authenticated or not an admin
 */
export async function getCurrentAdmin() {
  const user = await currentUser()
  const role = await getAdminRole()

  if (!user || !role) {
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
 * Require admin access - redirects to sign-in if not authenticated
 * or home if authenticated but not an admin
 */
export async function requireAdmin() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin")
  }

  const role = await getAdminRole()

  if (!role) {
    redirect("/?error=unauthorized")
  }

  return role
}

/**
 * Require editor or admin role for mutations
 */
export async function requireEditor() {
  const role = await requireAdmin()

  if (role === "viewer") {
    throw new Error("Insufficient permissions - editor access required")
  }

  return role
}

/**
 * Require full admin role
 */
export async function requireFullAdmin() {
  const role = await requireAdmin()

  if (role !== "admin") {
    throw new Error("Insufficient permissions - admin access required")
  }

  return role
}

/**
 * Check if current user can edit (editor or admin)
 */
export async function canEdit(): Promise<boolean> {
  const role = await getAdminRole()
  return role === "admin" || role === "editor"
}

/**
 * Check if current user is full admin
 */
export async function isFullAdmin(): Promise<boolean> {
  const role = await getAdminRole()
  return role === "admin"
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

  // TODO: In production, you may want to store this in the database
}
