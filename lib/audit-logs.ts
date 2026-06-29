import { sql } from "@/lib/db"

export type AuditLogEntry = {
  id: number
  action: string
  resourceType: string | null
  resourceId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  adminEmail: string | null
  ipAddress: string | null
  userAgent: string | null
}

export type AuditLogFilters = {
  action?: string
  from?: Date
  to?: Date
  limit?: number
}

function parseDetails(value: unknown): Record<string, unknown> | null {
  if (!value) return null
  if (typeof value === "object") return value as Record<string, unknown>
  if (typeof value !== "string") return null
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function listAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
  const limit = Math.min(filters.limit ?? 200, 200)
  const conditions: string[] = []
  const args: unknown[] = []

  if (filters.action?.trim()) {
    conditions.push("action LIKE ?")
    args.push(`${filters.action.trim()}%`)
  }
  if (filters.from) {
    conditions.push("datetime(created_at) >= datetime(?)")
    args.push(filters.from.toISOString())
  }
  if (filters.to) {
    conditions.push("datetime(created_at) <= datetime(?)")
    args.push(filters.to.toISOString())
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""
  args.push(limit)

  const rows = await sql.query(
    `SELECT
      id,
      admin_email,
      action,
      resource_type,
      resource_id,
      details,
      ip_address,
      user_agent,
      created_at
    FROM audit_logs
    ${where}
    ORDER BY datetime(created_at) DESC
    LIMIT ?`,
    args,
  )

  return rows.map((row) => ({
    id: Number(row.id),
    action: String(row.action),
    resourceType: row.resource_type ? String(row.resource_type) : null,
    resourceId: row.resource_id ? String(row.resource_id) : null,
    metadata: parseDetails(row.details),
    createdAt: String(row.created_at),
    adminEmail: row.admin_email ? String(row.admin_email) : null,
    ipAddress: row.ip_address ? String(row.ip_address) : null,
    userAgent: row.user_agent ? String(row.user_agent) : null,
  }))
}
