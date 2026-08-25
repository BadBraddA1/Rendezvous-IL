import { adminDashConfig, type AdminDashPermission } from "@/lib/admin-dash-config"
import type { AdminRole } from "@/lib/admin-permissions"

export function permissionsForRole(role: AdminRole): Set<AdminDashPermission> {
  const granted = adminDashConfig.rolePermissions[role] ?? []
  const all = [...new Set(adminDashConfig.nav.map((n) => n.permission))]
  if (granted.includes("*")) return new Set(all)
  return new Set(granted.filter((p): p is AdminDashPermission => p !== "*"))
}

export function permissionsRecord(role: AdminRole): Record<AdminDashPermission, boolean> {
  const set = permissionsForRole(role)
  const out = {} as Record<AdminDashPermission, boolean>
  for (const item of adminDashConfig.nav) {
    out[item.permission] = set.has(item.permission)
  }
  return out
}
