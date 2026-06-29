/**
 * Admin authentication utilities using Clerk
 */

import {
  getCurrentAdmin,
  getAdminPermissions,
  isAdminRole,
  requireCheckInApi,
  type AdminRole,
  type AdminUser,
} from "@/lib/clerk-auth"

export type { AdminRole, AdminUser }

/**
 * Any admin role (admin, editor, viewer, checkin)
 */
export async function checkAdminAuth(): Promise<AdminUser | null> {
  return getCurrentAdmin()
}

/**
 * Check-in station access (admin, editor, or checkin role)
 */
export async function checkCheckInAuth(): Promise<AdminUser | null> {
  try {
    return await requireCheckInApi()
  } catch {
    return null
  }
}

export { getAdminPermissions, isAdminRole }

/**
 * Log an audit action
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
