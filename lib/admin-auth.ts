/**
 * Admin authentication utilities using Clerk
 */

import { getCurrentAdmin, requireCheckInApi } from "@/lib/clerk-auth"
import { getAdminPermissions, isAdminRole } from "@/lib/admin-permissions"

export type { AdminRole, AdminUser } from "@/lib/admin-permissions"
export { getAdminPermissions, isAdminRole }

/**
 * Any admin role (admin, editor, viewer, checkin)
 */
export async function checkAdminAuth() {
  return getCurrentAdmin()
}

/**
 * Check-in station access (admin, editor, or checkin role)
 */
export async function checkCheckInAuth() {
  try {
    return await requireCheckInApi()
  } catch {
    return null
  }
}

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
