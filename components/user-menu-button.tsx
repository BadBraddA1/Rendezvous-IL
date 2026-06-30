"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useClerk, useUser } from "@clerk/nextjs"
import type { LucideIcon } from "lucide-react"
import { Loader2, LogOut, Shield, User, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface UserMenuLink {
  label: string
  href: string
  icon: LucideIcon
}

interface UserMenuButtonProps {
  size?: "sm" | "md"
  afterSignOutUrl?: string
  /** Override default site menu links */
  links?: UserMenuLink[]
  /** When false, skip the admin dashboard link even if the user is an admin */
  showAdminLink?: boolean
}

const defaultLinks: UserMenuLink[] = [
  { label: "Dashboard", href: "/account", icon: User },
  { label: "Family profile", href: "/account/profile", icon: Users },
]

function userInitials(firstName?: string | null, lastName?: string | null, email?: string | null) {
  const first = firstName?.trim()?.[0] ?? ""
  const last = lastName?.trim()?.[0] ?? ""
  if (first || last) return `${first}${last}`.toUpperCase()
  return email?.trim()?.[0]?.toUpperCase() ?? "?"
}

export function UserMenuButton({
  size = "md",
  afterSignOutUrl = "/",
  links,
  showAdminLink = true,
}: UserMenuButtonProps) {
  const { isLoaded, user } = useUser()
  const { signOut } = useClerk()
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || !isLoaded || !user) {
      if (isLoaded && !user) setAdminChecked(true)
      return
    }

    let cancelled = false

    async function checkAdminStatus() {
      try {
        const response = await fetch("/api/auth/check-admin")
        const data = await response.json()
        if (!cancelled) setIsAdmin(Boolean(data.isAdmin))
      } catch {
        if (!cancelled) setIsAdmin(false)
      } finally {
        if (!cancelled) setAdminChecked(true)
      }
    }

    checkAdminStatus()
    return () => {
      cancelled = true
    }
  }, [isMounted, isLoaded, user])

  const avatarSize = size === "sm" ? "h-9 w-9" : "h-10 w-10"
  const menuLinks = links ?? defaultLinks
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    "Account"
  const email = user?.primaryEmailAddress?.emailAddress

  if (!isMounted || !isLoaded || !adminChecked) {
    return (
      <div className={cn(avatarSize, "flex items-center justify-center rounded-full bg-muted")}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="focus-ring rounded-full outline-none"
          aria-label="Open account menu"
        >
          <Avatar className={avatarSize}>
            <AvatarImage src={user.imageUrl} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
              {userInitials(user.firstName, user.lastName, email)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {email && <p className="text-xs leading-none text-muted-foreground">{email}</p>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {menuLinks.map(({ label, href, icon: Icon }) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href} className="flex cursor-pointer items-center gap-2">
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
        {!links && (
          <DropdownMenuItem asChild>
            <Link href="/account/settings" className="flex cursor-pointer items-center gap-2">
              <User className="h-4 w-4" />
              Account settings
            </Link>
          </DropdownMenuItem>
        )}
        {showAdminLink && isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex cursor-pointer items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin dashboard
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={() => signOut({ redirectUrl: afterSignOutUrl })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
