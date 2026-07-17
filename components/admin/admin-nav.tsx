"use client"

import Link from "next/link"
import { UserMenuButton } from "@/components/user-menu-button"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LayoutDashboard, Users, Settings, FileText, MapPin, MessageSquare, Utensils, Eye, ClipboardCheck, User, Home, Shield, DollarSign, ScanLine, UserCheck, QrCode, Megaphone, Star, Calculator, ChevronDown, Monitor, Church, BookOpen, ClipboardList, HeartHandshake, CalendarDays, Contact, Images, PanelsTopLeft } from "lucide-react"
import type { AdminRole } from "@/lib/admin-permissions"
import { getAdminPermissions } from "@/lib/admin-permissions"

interface AdminNavProps {
  currentPage: string
  admin: { 
    email: string
    fullName: string
    role: AdminRole
  }
}

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  page: string
  show?: (role: AdminRole) => boolean
}

type NavGroup = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
}

export function AdminNav({ currentPage, admin }: AdminNavProps) {
  // Grouped navigation items
  const navGroups: NavGroup[] = [
    {
      label: "Registrations",
      icon: Users,
      items: [
        {
          href: "/admin/registrations",
          label: "All Registrations",
          icon: Users,
          page: "registrations",
          show: (role) => getAdminPermissions(role).canViewRegistrations,
        },
        {
          href: "/admin/checkin",
          label: "Check-In",
          icon: ScanLine,
          page: "checkin",
          show: (role) => getAdminPermissions(role).canCheckIn,
        },
        {
          href: "/admin/checked-in",
          label: "Checked In",
          icon: UserCheck,
          page: "checked-in",
          show: (role) => getAdminPermissions(role).canCheckIn,
        },
        {
          href: "/admin/qr-codes",
          label: "QR Codes",
          icon: QrCode,
          page: "qr-codes",
          show: (role) => getAdminPermissions(role).canEdit,
        },
        {
          href: "/admin/pending-changes",
          label: "Pending Changes",
          icon: ClipboardCheck,
          page: "pending-changes",
          show: (role) => getAdminPermissions(role).canEdit,
        },
        {
          href: "/admin/directory",
          label: "Family Directory",
          icon: Contact,
          page: "directory",
          show: (role) => getAdminPermissions(role).canViewRegistrations,
        },
      ],
    },
    {
      label: "Communication",
      icon: MessageSquare,
      items: [
        {
          href: "/admin/announcements",
          label: "Announcements",
          icon: Megaphone,
          page: "announcements",
          show: (role) => getAdminPermissions(role).canEdit,
        },
        {
          href: "/admin/displays",
          label: "Displays",
          icon: Monitor,
          page: "displays",
          show: (role) => getAdminPermissions(role).canViewRegistrations,
        },
        {
          href: "/admin/photoshow",
          label: "Photoshow",
          icon: Images,
          page: "photoshow",
          show: (role) => getAdminPermissions(role).canEdit,
        },
        {
          href: "/admin/messaging",
          label: "Messaging",
          icon: MessageSquare,
          page: "messaging",
          show: (role) => getAdminPermissions(role).canViewRegistrations,
        },
        {
          href: "/admin/chat",
          label: "Year Chat",
          icon: MessageSquare,
          page: "chat",
          show: (role) => getAdminPermissions(role).canViewRegistrations,
        },
        {
          href: "/admin/feedback",
          label: "Feedback",
          icon: Star,
          page: "feedback",
          show: (role) => getAdminPermissions(role).canViewRegistrations,
        },
      ],
    },
    {
      label: "Event",
      icon: Utensils,
      items: [
        {
          href: "/admin/schedule",
          label: "Schedule",
          icon: CalendarDays,
          page: "schedule",
          show: (role) => getAdminPermissions(role).canViewRegistrations,
        },
        {
          href: "/admin/home-board",
          label: "Home board",
          icon: PanelsTopLeft,
          page: "home-board",
          show: (role) => getAdminPermissions(role).canViewRegistrations,
        },
        {
          href: "/admin/meals",
          label: "Meals",
          icon: Utensils,
          page: "meals",
          show: (role) => getAdminPermissions(role).canViewRegistrations,
        },
        {
          href: "/admin/map",
          label: "Map",
          icon: MapPin,
          page: "map",
          show: (role) => getAdminPermissions(role).canViewRegistrations,
        },
      ],
    },
    {
      label: "Volunteers",
      icon: HeartHandshake,
      items: [
        {
          href: "/admin/volunteers",
          label: "Worship Service",
          icon: Church,
          page: "volunteers-worship",
          show: (role) => getAdminPermissions(role).canViewRegistrations,
        },
        {
          href: "/admin/volunteers/lesson-bids",
          label: "Lesson Bids",
          icon: BookOpen,
          page: "volunteers-lesson-bids",
          show: (role) => getAdminPermissions(role).canViewRegistrations,
        },
        {
          href: "/admin/volunteers/special-assignments",
          label: "Special Assignments",
          icon: ClipboardList,
          page: "volunteers-special",
          show: (role) => getAdminPermissions(role).canViewRegistrations,
        },
      ],
    },
    {
      label: "Settings",
      icon: Settings,
      items: [
        {
          href: "/admin/rates",
          label: "Rates",
          icon: DollarSign,
          page: "rates",
          show: (role) => getAdminPermissions(role).canManageUsers,
        },
        {
          href: "/admin/calculator",
          label: "Calculator",
          icon: Calculator,
          page: "calculator",
          show: (role) => getAdminPermissions(role).canManageUsers,
        },
        {
          href: "/admin/users",
          label: "Users",
          icon: Shield,
          page: "users",
          show: (role) => getAdminPermissions(role).canManageUsers,
        },
        {
          href: "/admin/settings",
          label: "Settings",
          icon: Settings,
          page: "settings",
          show: (role) => getAdminPermissions(role).canManageUsers,
        },
        {
          href: "/admin/audit",
          label: "Audit Logs",
          icon: FileText,
          page: "audit",
          show: (role) => getAdminPermissions(role).canManageUsers,
        },
      ],
    },
  ]

  const getRoleBadgeVariant = (role: AdminRole) => {
    switch (role) {
      case "admin":
        return "default"
      case "editor":
        return "secondary"
      case "checkin":
        return "secondary"
      case "viewer":
        return "outline"
    }
  }

  const getAccessibleItems = (items: NavItem[]) => {
    return items.filter((item) => !item.show || item.show(admin.role))
  }

  const isGroupActive = (group: NavGroup) => {
    return group.items.some((item) => currentPage === item.page)
  }

  return (
    <header className="border-b bg-card">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-lg font-semibold hover:text-primary transition-colors">
            Rendezvous Admin
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {/* Dashboard - standalone */}
            <Link href="/admin">
              <Button 
                variant={currentPage === "dashboard" || currentPage === "" ? "secondary" : "ghost"} 
                size="sm" 
                className="gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>

            {/* Grouped navigation */}
            {navGroups.map((group) => {
              const accessibleItems = getAccessibleItems(group.items)
              if (accessibleItems.length === 0) return null

              const GroupIcon = group.icon
              const groupActive = isGroupActive(group)

              return (
                <DropdownMenu key={group.label}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant={groupActive ? "secondary" : "ghost"} 
                      size="sm" 
                      className="gap-1.5"
                    >
                      <GroupIcon className="h-4 w-4" />
                      {group.label}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {accessibleItems.map((item) => {
                      const Icon = item.icon
                      const isActive = currentPage === item.page

                      return (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link 
                            href={item.href} 
                            className={`flex items-center gap-2 ${isActive ? "bg-secondary" : ""}`}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
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
          {admin.role === "checkin" && (
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <ScanLine className="h-4 w-4" />
              <span>Check-In Staff</span>
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
          <UserMenuButton
            size="md"
            afterSignOutUrl="/admin/login"
            showAdminLink={false}
            links={[
              { label: "My account", href: "/account", icon: User },
              { label: "Back to site", href: "/", icon: Home },
            ]}
          />
        </div>
      </div>
      
      {/* Mobile nav - scrollable row with 44px touch targets */}
      <div className="md:hidden border-t px-4 py-2 overflow-x-auto scroll-touch-x">
        <nav className="flex gap-2">
          {/* Dashboard */}
          <Link href="/admin">
            <Button 
              variant={currentPage === "dashboard" || currentPage === "" ? "secondary" : "ghost"} 
              className="min-h-11 gap-2 whitespace-nowrap"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>

          {/* Grouped dropdowns for mobile */}
          {navGroups.map((group) => {
            const accessibleItems = getAccessibleItems(group.items)
            if (accessibleItems.length === 0) return null

            const GroupIcon = group.icon
            const groupActive = isGroupActive(group)

            return (
              <DropdownMenu key={group.label}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant={groupActive ? "secondary" : "ghost"} 
                    className="min-h-11 gap-1.5 whitespace-nowrap"
                  >
                    <GroupIcon className="h-4 w-4" />
                    {group.label}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {accessibleItems.map((item) => {
                    const Icon = item.icon
                    const isActive = currentPage === item.page

                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link 
                          href={item.href} 
                          className={`flex items-center gap-2 ${isActive ? "bg-secondary" : ""}`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
