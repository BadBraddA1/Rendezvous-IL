/**
 * Admin authentication utilities using Clerk
 */

import { getCurrentAdmin, requireCheckInApi } from "@/lib/clerk-auth"
import { getAdminPermissions, isAdminRole } from "@/lib/admin-permissions"
import { writeAuditLog } from "@/lib/audit-log"

export type { AdminRole, AdminUser } from "@/lib/admin-permissions"
export { getAdminPermissions, isAdminRole }

/**
 * Any admin role (admin, editor, viewer, checkin).
 * Pass `request` from route handlers so mobile Bearer tokens always resolve.
 * When omitted, clerk-auth still reads Authorization from Next.js headers.
 */
export async function checkAdminAuth(request?: Request) {
  return getCurrentAdmin(request)
}

/**
 * Check-in station access (admin, editor, or checkin role)
 */
export async function checkCheckInAuth(request?: Request) {
  try {
    return await requireCheckInApi(request)
  } catch {
    return null
  }
}

/**
 * Persist an audit log entry to Turso.
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
  await writeAuditLog({
    adminEmail,
    action,
    resourceType,
    resourceId,
    details,
    ipAddress,
    userAgent,
  })
}
