"use client"

import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LayoutDashboard, Users, Settings, FileText, MapPin, MessageSquare, Utensils, Eye, ClipboardCheck, User, Home, Shield, DollarSign, ScanLine, UserCheck, QrCode, Megaphone, Star, Calculator } from "lucide-react"
import type { AdminRole } from "@/lib/clerk-auth"

interface AdminNavProps {
  currentPage: string
  admin: { 
    email: string
    fullName: string
    role: AdminRole
  }
}

export function AdminNav({ currentPage, admin }: AdminNavProps) {
  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
    { href: "/admin/registrations", label: "Registrations", icon: Users, page: "registrations" },
    { href: "/admin/checkin", label: "Check-In", icon: ScanLine, page: "checkin", minRole: "editor" as AdminRole },
    { href: "/admin/checked-in", label: "Checked In", icon: UserCheck, page: "checked-in" },
    { href: "/admin/qr-codes", label: "QR Codes", icon: QrCode, page: "qr-codes", minRole: "editor" as AdminRole },
    { href: "/admin/pending-changes", label: "Pending", icon: ClipboardCheck, page: "pending-changes", minRole: "editor" as AdminRole },
    { href: "/admin/announcements", label: "Announcements", icon: Megaphone, page: "announcements", minRole: "editor" as AdminRole },
    { href: "/admin/feedback", label: "Feedback", icon: Star, page: "feedback" },
    { href: "/admin/messaging", label: "Messaging", icon: MessageSquare, page: "messaging" },
    { href: "/admin/meals", label: "Meals", icon: Utensils, page: "meals" },
    { href: "/admin/map", label: "Map", icon: MapPin, page: "map" },
    { href: "/admin/rates", label: "Rates", icon: DollarSign, page: "rates", minRole: "admin" as AdminRole },
    { href: "/admin/calculator", label: "Calculator", icon: Calculator, page: "calculator", minRole: "admin" as AdminRole },
    { href: "/admin/users", label: "Users", icon: Shield, page: "users", minRole: "admin" as AdminRole },
    { href: "/admin/settings", label: "Settings", icon: Settings, page: "settings", minRole: "admin" as AdminRole },
    { href: "/admin/audit", label: "Audit Logs", icon: FileText, page: "audit", minRole: "admin" as AdminRole },
  ]

  // Role hierarchy for access control
  const roleHierarchy: Record<AdminRole, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
  }

  const hasAccess = (minRole?: AdminRole) => {
    if (!minRole) return true
    return roleHierarchy[admin.role] >= roleHierarchy[minRole]
  }

  const getRoleBadgeVariant = (role: AdminRole) => {
    switch (role) {
      case "admin":
        return "default"
      case "editor":
        return "secondary"
      case "viewer":
        return "outline"
    }
  }

  return (
    <header className="border-b bg-card">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-lg font-semibold hover:text-primary transition-colors">
            Rendezvous Admin
          </Link>
          <nav className="hidden md:flex gap-1">
            {navItems.map((item) => {
              if (!hasAccess(item.minRole)) return null

              const Icon = item.icon
              const isActive = currentPage === item.page || (currentPage === "" && item.page === "dashboard")

              return (
                <Link key={item.href} href={item.href}>
                  <Button variant={isActive ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {admin.role === "viewer" && (
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>View Only</span>
            </div>
          )}
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium">{admin.fullName || admin.email}</p>
            <div className="flex items-center justify-end gap-2">
              <Badge variant={getRoleBadgeVariant(admin.role)} className="text-xs capitalize">
                {admin.role}
              </Badge>
            </div>
          </div>
          <UserButton 
            afterSignOutUrl="/admin/login"
            appearance={{
              elements: {
                avatarBox: "h-9 w-9"
              }
            }}
          >
            <UserButton.MenuItems>
              <UserButton.Link label="My Account" href="/account" labelIcon={<User className="h-4 w-4" />} />
              <UserButton.Link label="Back to Site" href="/" labelIcon={<Home className="h-4 w-4" />} />
            </UserButton.MenuItems>
          </UserButton>
        </div>
      </div>
      
      {/* Mobile nav */}
      <div className="md:hidden border-t px-4 py-2 overflow-x-auto">
        <nav className="flex gap-1">
          {navItems.map((item) => {
            if (!hasAccess(item.minRole)) return null

            const Icon = item.icon
            const isActive = currentPage === item.page || (currentPage === "" && item.page === "dashboard")

            return (
              <Link key={item.href} href={item.href}>
                <Button variant={isActive ? "secondary" : "ghost"} size="sm" className="gap-2 whitespace-nowrap">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
