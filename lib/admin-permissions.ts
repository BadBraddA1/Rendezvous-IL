export type AdminRole = "admin" | "editor" | "viewer" | "checkin"

export const ADMIN_ROLES: AdminRole[] = ["admin", "editor", "viewer", "checkin"]

export interface AdminPermissions {
  canViewDashboard: boolean
  canViewRegistrations: boolean
  canCheckIn: boolean
  canEdit: boolean
  canManageUsers: boolean
}

export interface AdminUser {
  id: string
  email: string
  fullName: string
  role: AdminRole
}

export function isAdminRole(role: string | undefined | null): role is AdminRole {
  return !!role && ADMIN_ROLES.includes(role as AdminRole)
}

export function getAdminPermissions(role: AdminRole): AdminPermissions {
  switch (role) {
    case "admin":
      return {
        canViewDashboard: true,
        canViewRegistrations: true,
        canCheckIn: true,
        canEdit: true,
        canManageUsers: true,
      }
    case "editor":
      return {
        canViewDashboard: true,
        canViewRegistrations: true,
        canCheckIn: true,
        canEdit: true,
        canManageUsers: false,
      }
    case "viewer":
      return {
        canViewDashboard: true,
        canViewRegistrations: true,
        canCheckIn: false,
        canEdit: false,
        canManageUsers: false,
      }
    case "checkin":
      return {
        canViewDashboard: true,
        canViewRegistrations: false,
        canCheckIn: true,
        canEdit: false,
        canManageUsers: false,
      }
  }
}

export function canEdit(role: AdminRole | null): boolean {
  return !!role && getAdminPermissions(role).canEdit
}

export function canCheckIn(role: AdminRole | null): boolean {
  return !!role && getAdminPermissions(role).canCheckIn
}

export function isFullAdmin(role: AdminRole | null): boolean {
  return role === "admin"
}
