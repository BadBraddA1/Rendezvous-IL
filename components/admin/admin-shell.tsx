"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import useSWR from "swr"
import { Suspense, type ReactNode } from "react"
import {
  Calculator,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Contact,
  DollarSign,
  Home,
  MessageSquare,
  ScanLine,
  Settings,
  Shield,
  Star,
  Users,
  Utensils,
  HeartHandshake,
  Megaphone,
  UserCheck,
  type LucideIcon,
} from "lucide-react"
import { adminDashConfig, type AdminDashPermission } from "@/lib/admin-dash-config"
import { AdminEventYearSwitcher } from "@/components/admin/admin-event-year-switcher"
import { AdminUiToggle } from "@/components/admin/admin-ui-toggle"
import { UserMenuButton } from "@/components/user-menu-button"
import "@/app/admin-dash.css"

type MeResponse = {
  staff: {
    role: string
    email: string | null
    fullName: string | null
    permissions: Partial<Record<AdminDashPermission, boolean>>
  }
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const ICONS: Partial<Record<string, LucideIcon>> = {
  "/admin/new": Home,
  "/admin/registrations": Users,
  "/admin/directory": Contact,
  "/admin/pending-changes": ClipboardCheck,
  "/admin/checkin": ScanLine,
  "/admin/checked-in": UserCheck,
  "/admin/announcements": Megaphone,
  "/admin/chat": MessageSquare,
  "/admin/messaging": MessageSquare,
  "/admin/feedback": Star,
  "/admin/schedule": CalendarDays,
  "/admin/meals": Utensils,
  "/admin/home-board": CalendarDays,
  "/admin/volunteers": HeartHandshake,
  "/admin/rates": DollarSign,
  "/admin/calculator": Calculator,
  "/admin/users": Shield,
  "/admin/settings": Settings,
  "/admin/audit": ClipboardList,
}

function navActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { data, error, isLoading } = useSWR<MeResponse>("/api/admin/me", fetcher)

  if (isLoading) {
    return (
      <div className="ad-page flex items-center justify-center text-sm" style={{ color: "var(--ad-muted)" }}>
        Loading staff session…
      </div>
    )
  }

  if (error || !data?.staff) {
    return (
      <div className="ad-page flex flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-xl font-semibold">Staff access required</h1>
        <p className="max-w-md text-sm" style={{ color: "var(--ad-muted)" }}>
          Sign in with a Clerk account that has an admin role.
        </p>
        <Link href={`${adminDashConfig.signInUrl}?redirect_url=/admin/new`} className="text-sm underline">
          Sign in
        </Link>
      </div>
    )
  }

  const { staff } = data
  const links = adminDashConfig.nav.filter((n) => staff.permissions[n.permission])
  const roleLabel = adminDashConfig.roleLabels[staff.role] ?? staff.role

  return (
    <div className="ad-page font-sans">
      <aside className="ad-aside hidden w-48 lg:flex">
        <div className="ad-aside-brand border-b px-3 py-3" style={{ borderColor: "var(--ad-line)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ad-muted)" }}>
            {adminDashConfig.siteName}
          </p>
          <p className="mt-0.5 text-sm font-semibold leading-tight">{adminDashConfig.title}</p>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--ad-muted)" }}>
            {roleLabel}
          </p>
        </div>
        <nav className="ad-aside-nav flex flex-col gap-px p-1.5">
          {links.map(({ href, label, exact }) => {
            const active = navActive(pathname, href, exact)
            const Icon = ICONS[href] ?? Home
            return (
              <Link
                key={href}
                href={href}
                data-active={active}
                className="ad-nav-link flex items-center gap-2 px-2 py-1.5 text-[13px] transition-colors"
              >
                <Icon size={14} className="shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div
          className="ad-aside-foot space-y-2 border-t p-2"
          style={{ borderColor: "var(--ad-line)" }}
        >
          <AdminUiToggle mode="new" />
          <UserMenuButton size="sm" afterSignOutUrl="/admin/login" />
          <Link
            href={adminDashConfig.homeUrl}
            className="block px-1 text-xs font-semibold underline underline-offset-2"
            style={{ color: "var(--ad-primary)" }}
          >
            View public site
          </Link>
        </div>
      </aside>

      <div className="ad-main-col">
        <header className="ad-header px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
                {adminDashConfig.orgName}
              </p>
              <h1 className="text-base font-bold tracking-tight sm:text-lg">{adminDashConfig.title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Suspense fallback={null}>
                <AdminEventYearSwitcher compact id="shell-event-year" />
              </Suspense>
              <div className="lg:hidden">
                <AdminUiToggle mode="new" />
              </div>
              <div className="lg:hidden">
                <UserMenuButton size="sm" afterSignOutUrl="/admin/login" />
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1 lg:hidden">
            {links.map(({ href, label, exact }) => (
              <Link
                key={href}
                href={href}
                className="ad-chip"
                data-active={navActive(pathname, href, exact)}
              >
                {label}
              </Link>
            ))}
          </div>
        </header>
        <main className="ad-main-scroll px-2.5 py-2.5 sm:px-3 sm:py-3 lg:px-4">{children}</main>
      </div>
    </div>
  )
}
