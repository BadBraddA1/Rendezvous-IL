import { sql } from "@/lib/db"

export type AuditLogInput = {
  adminEmail: string
  action: string
  resourceType?: string
  resourceId?: number | string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export function getRequestAuditMeta(request?: Request) {
  if (!request) {
    return { ipAddress: undefined, userAgent: undefined }
  }

  const forwarded = request.headers.get("x-forwarded-for")
  const ipAddress =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined

  return {
    ipAddress,
    userAgent: request.headers.get("user-agent") || undefined,
  }
}

export async function writeAuditLog(input: AuditLogInput) {
  try {
    await sql`
      INSERT INTO audit_logs (
        admin_email,
        action,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent
      )
      VALUES (
        ${input.adminEmail},
        ${input.action},
        ${input.resourceType || null},
        ${input.resourceId != null ? String(input.resourceId) : null},
        ${input.details ? JSON.stringify(input.details) : null},
        ${input.ipAddress || null},
        ${input.userAgent || null}
      )
    `
  } catch (error) {
    console.error("[Audit] Failed to write audit log:", error)
  }
}
