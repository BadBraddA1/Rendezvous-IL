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

function parseMemberData(value: unknown) {
  if (!value) return null
  if (typeof value === "object") return value as Record<string, unknown>
  if (typeof value !== "string") return null
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return null
  }
}

export function buildPendingChangeAuditDetails(
  change: Record<string, unknown>,
  notes?: string | null,
) {
  const details: Record<string, unknown> = {
    change_type: change.change_type,
    family_id: change.family_id,
    notes: notes || null,
  }

  if (change.change_type === "update_field" && change.field_name) {
    const fieldName = String(change.field_name)
    details.field_name = fieldName
    details.from = { [fieldName]: change.old_value ?? "" }
    details.to = { [fieldName]: change.new_value ?? "" }
  }

  const memberData = parseMemberData(change.member_data)
  if (memberData && (change.change_type === "add_member" || change.change_type === "update_member")) {
    const memberName = `${memberData.first_name ?? ""} ${memberData.last_name ?? ""}`.trim()
    details.member_summary = memberName || null
    details.to = {
      member: memberName || "New member",
      member_type: memberData.member_type ?? null,
      phone: memberData.phone ?? null,
      grade: memberData.grade ?? null,
    }
  }

  if (change.change_type === "remove_member") {
    details.member_id = change.member_id ?? null
  }

  return details
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
