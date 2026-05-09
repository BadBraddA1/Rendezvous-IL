"use client"

import { useEffect, useState } from "react"
import { UserButton } from "@clerk/nextjs"
import { User, Users, Shield } from "lucide-react"

interface UserMenuButtonProps {
  size?: "sm" | "md"
  afterSignOutUrl?: string
}

export function UserMenuButton({ size = "md", afterSignOutUrl = "/" }: UserMenuButtonProps) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const response = await fetch("/api/auth/check-admin")
        const data = await response.json()
        setIsAdmin(data.isAdmin)
      } catch (error) {
        console.error("[UserMenuButton] Error checking admin status:", error)
        setIsAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminStatus()
  }, [])

  const avatarSize = size === "sm" ? "h-9 w-9" : "h-10 w-10"

  // While loading, show UserButton without custom menu items
  if (isLoading) {
    return (
      <UserButton 
        afterSignOutUrl={afterSignOutUrl}
        appearance={{
          elements: {
            avatarBox: avatarSize
          }
        }}
      />
    )
  }

  return (
    <UserButton 
      afterSignOutUrl={afterSignOutUrl}
      appearance={{
        elements: {
          avatarBox: avatarSize
        }
      }}
    >
      <UserButton.MenuItems>
        <UserButton.Link 
          label="Dashboard" 
          href="/account" 
          labelIcon={<User className="h-4 w-4" />} 
        />
        <UserButton.Link 
          label="Family Profile" 
          href="/account/profile" 
          labelIcon={<Users className="h-4 w-4" />} 
        />
        {isAdmin && (
          <UserButton.Link 
            label="Admin Dashboard" 
            href="/admin" 
            labelIcon={<Shield className="h-4 w-4" />} 
          />
        )}
      </UserButton.MenuItems>
    </UserButton>
  )
}
