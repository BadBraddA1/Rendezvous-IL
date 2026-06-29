import type { AuditLogEntry } from "@/lib/audit-logs"

export const AUDIT_ACTION_LABELS: Record<string, { label: string; color: string }> = {
  approve_pending_change: { label: "Profile change approved", color: "success" },
  reject_pending_change: { label: "Profile change rejected", color: "danger" },
  enable_directory_year: { label: "Directory enabled", color: "success" },
  disable_directory_year: { label: "Directory disabled", color: "warning" },
  export_registrations: { label: "Registrations exported", color: "brand" },
  check_in_registration: { label: "Family checked in", color: "success" },
  undo_check_in: { label: "Check-in undone", color: "warning" },
  update_user_role: { label: "Admin role changed", color: "brand" },
  update_settings: { label: "Settings updated", color: "neutral" },
  admin_logout: { label: "Admin signed out", color: "neutral" },
  password_changed: { label: "Password changed", color: "brand" },
  password_change_failed: { label: "Password change failed", color: "danger" },
}

export const AUDIT_CATEGORY_FILTERS = [
  { value: "", label: "All actions" },
  { value: "approve_pending_change", label: "Profile approvals" },
  { value: "reject_pending_change", label: "Profile rejections" },
  { value: "enable_directory", label: "Directory enabled" },
  { value: "disable_directory", label: "Directory disabled" },
  { value: "export_", label: "Exports" },
  { value: "check_in", label: "Check-ins" },
  { value: "undo_check", label: "Check-in undone" },
  { value: "update_user_role", label: "Admin roles" },
  { value: "update_settings", label: "Settings" },
  { value: "password", label: "Password" },
]

export function resolveAuditAction(action: string) {
  return AUDIT_ACTION_LABELS[action] ?? {
    label: action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    color: "neutral",
  }
}

export function resolveAuditActorName(log: AuditLogEntry): string {
  if (log.adminEmail) return log.adminEmail
  return "System"
}

export function humanizeAuditKey(key: string): string {
  const labels: Record<string, string> = {
    change_type: "Change type",
    family_id: "Family ID",
    family_last_name: "Family",
    field_name: "Field",
    member_summary: "Member",
    row_count: "Rows exported",
    year: "Event year",
    enabled: "Enabled",
    room_keys: "Room keys",
    tshirts_distributed: "T-shirts distributed",
    target_email: "User email",
    user_id: "User ID",
    role: "Role",
    notes: "Review notes",
    reason: "Reason",
    ip_address: "IP address",
    user_agent: "Browser",
  }
  if (labels[key]) return labels[key]

  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/** Hide noisy internal metadata from detail panels. */
export function publicAuditMetadata(
  metadata: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!metadata) return null
  const hidden = new Set(["role"])
  const entries = Object.entries(metadata).filter(([key]) => !hidden.has(key))
  if (entries.length === 0) return null
  return Object.fromEntries(entries)
}

export function auditActionCategory(action: string): string {
  if (action.includes("pending")) return "profile"
  if (action.includes("directory")) return "directory"
  if (action.includes("export") || action.includes("check_in")) return "registration"
  if (action.includes("settings")) return "settings"
  if (action.includes("user_role") || action.includes("password") || action.includes("logout")) {
    return "admin"
  }
  return "other"
}
