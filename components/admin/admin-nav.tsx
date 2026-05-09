"use client"

import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, Settings, FileText, MapPin, MessageSquare, Utensils } from "lucide-react"

interface AdminNavProps {
  currentPage: string
  admin: { email: string; fullName?: string }
}

export function AdminNav({ currentPage, admin }: AdminNavProps) {

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
    { href: "/admin/registrations", label: "Registrations", icon: Users, page: "registrations" },
    { href: "/admin/messaging", label: "Messaging", icon: MessageSquare, page: "messaging" },
    { href: "/admin/meals", label: "Meals", icon: Utensils, page: "meals" },
    { href: "/admin/map", label: "Map", icon: MapPin, page: "map" },
    { href: "/admin/settings", label: "Settings", icon: Settings, page: "settings" },
    { href: "/admin/audit", label: "Audit Logs", icon: FileText, page: "audit" },
  ]

  return (
    <header className="border-b bg-card">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold">Rendezvous Admin</h1>
          <nav className="flex gap-1">
            {navItems.map((item) => {
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
          <div className="text-right">
            <p className="text-sm font-medium">{admin.fullName || admin.email}</p>
            <p className="text-xs text-muted-foreground">{admin.email}</p>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  )
}
