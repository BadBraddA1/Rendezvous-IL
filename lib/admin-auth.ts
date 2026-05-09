/**
 * Admin authentication utilities using Clerk
 * This file provides a compatibility layer for the old admin auth system
 */

import { auth, currentUser } from "@clerk/nextjs/server"

export type AdminRole = "admin" | "editor" | "viewer"

/**
 * Check admin authentication and return admin details
 * Returns null if user is not authenticated or not an admin
 * 
 * This replaces the old cookie-based checkAdminAuth function
 */
export async function checkAdminAuth(): Promise<{
  email: string
  fullName: string
  role: AdminRole
} | null> {
  const { userId, sessionClaims } = await auth()

  if (!userId) {
    return null
  }

  // Check for role in public metadata
  const role = sessionClaims?.metadata?.role as AdminRole | undefined

  if (!role || !["admin", "editor", "viewer"].includes(role)) {
    return null
  }

  const user = await currentUser()

  if (!user) {
    return null
  }

  return {
    email: user.emailAddresses[0]?.emailAddress || "",
    fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    role,
  }
}

/**
 * Log an audit action
 * TODO: Store in database for production use
 */
export async function logAuditAction(
  adminEmail: string,
  action: string,
  resourceType?: string,
  resourceId?: number,
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string,
) {
  console.log("[Audit]", {
    timestamp: new Date().toISOString(),
    adminEmail,
    action,
    resourceType,
    resourceId,
    details,
    ipAddress,
    userAgent,
  })
}
