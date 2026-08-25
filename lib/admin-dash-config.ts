/**
 * Rendezvous IL — BraddCorp admin dash config (LECYC/Camp Ruby shell).
 * Colors: app/admin-dash.css. Roles match lib/admin-permissions.ts.
 */

export type AdminDashPermission =
  | "overview"
  | "registrations"
  | "checkin"
  | "communication"
  | "event"
  | "volunteers"
  | "users"
  | "settings"
  | "audit"

export type AdminDashNavItem = {
  href: string
  label: string
  permission: AdminDashPermission
  exact?: boolean
}

export const adminDashConfig = {
  siteName: "Rendezvous IL",
  orgName: "Rendezvous Christian Homeschool Family Retreat",
  title: "Staff admin",
  homeUrl: "/",
  signInUrl: "/sign-in",

  /** Flat sidebar — maps to classic AdminNav groups. */
  nav: [
    { href: "/admin/new", label: "Overview", permission: "overview", exact: true },
    { href: "/admin/registrations", label: "Registrations", permission: "registrations" },
    { href: "/admin/directory", label: "Family Directory", permission: "registrations" },
    { href: "/admin/pending-changes", label: "Pending changes", permission: "registrations" },
    { href: "/admin/checkin", label: "Check-In", permission: "checkin" },
    { href: "/admin/checked-in", label: "Checked In", permission: "checkin" },
    { href: "/admin/announcements", label: "Announcements", permission: "communication" },
    { href: "/admin/chat", label: "Year Chat", permission: "communication" },
    { href: "/admin/messaging", label: "Messaging", permission: "communication" },
    { href: "/admin/feedback", label: "Feedback", permission: "communication" },
    { href: "/admin/schedule", label: "Schedule", permission: "event" },
    { href: "/admin/meals", label: "Meals", permission: "event" },
    { href: "/admin/home-board", label: "Home board", permission: "event" },
    { href: "/admin/volunteers", label: "Volunteers", permission: "volunteers" },
    { href: "/admin/rates", label: "Rates", permission: "settings" },
    { href: "/admin/calculator", label: "Calculator", permission: "settings" },
    { href: "/admin/users", label: "Users", permission: "users" },
    { href: "/admin/settings", label: "Settings", permission: "settings" },
    { href: "/admin/audit", label: "Audit log", permission: "audit" },
  ] satisfies AdminDashNavItem[],

  rolePermissions: {
    admin: ["*"] as const,
    editor: [
      "overview",
      "registrations",
      "checkin",
      "communication",
      "event",
      "volunteers",
    ] as const,
    viewer: ["overview", "registrations", "communication", "event", "volunteers"] as const,
    checkin: ["overview", "checkin"] as const,
  } as Record<string, readonly (AdminDashPermission | "*")[]>,

  roleLabels: {
    admin: "Admin",
    editor: "Editor",
    viewer: "Viewer",
    checkin: "Check-In",
  } as Record<string, string>,
}

export type AdminDashConfig = typeof adminDashConfig
