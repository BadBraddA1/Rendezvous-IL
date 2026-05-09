import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export type AdminRole = "admin" | "editor" | "viewer"

/**
 * Get the current user's admin role from Clerk metadata
 * Returns null if user is not an admin
 */
export async function getAdminRole(): Promise<AdminRole | null> {
  const { userId } = await auth()

  if (!userId) {
    console.log("[v0] getAdminRole: No userId found")
    return null
  }

  // Get the full user to access publicMetadata
  const user = await currentUser()
  
  if (!user) {
    console.log("[v0] getAdminRole: No user found for userId:", userId)
    return null
  }

  // Check for role in public metadata (set via Clerk Dashboard or API)
  const publicMetadata = user.publicMetadata as { role?: string } | undefined
  console.log("[v0] getAdminRole: publicMetadata:", JSON.stringify(publicMetadata))
  const role = publicMetadata?.role as AdminRole | undefined

  if (!role || !["admin", "editor", "viewer"].includes(role)) {
    console.log("[v0] getAdminRole: No valid role found, role value:", role)
    return null
  }

  console.log("[v0] getAdminRole: Found role:", role)
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
 * Require admin access for API routes
 * Returns admin info or throws an error (for use in route handlers)
 */
export async function requireAdminApi() {
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

  // TODO: In production, you may want to store this in the database
}
