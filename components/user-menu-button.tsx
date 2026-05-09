"use client"

import { useEffect, useState } from "react"
import { UserButton, useUser } from "@clerk/nextjs"
import { User, Users, Shield, Loader2 } from "lucide-react"

interface UserMenuButtonProps {
  size?: "sm" | "md"
  afterSignOutUrl?: string
}

export function UserMenuButton({ size = "md", afterSignOutUrl = "/" }: UserMenuButtonProps) {
  const { isLoaded: userLoaded } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

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

    if (isMounted && userLoaded) {
      checkAdminStatus()
    }
  }, [isMounted, userLoaded])

  const avatarSize = size === "sm" ? "h-9 w-9" : "h-10 w-10"

  // Wait for client-side mounting and Clerk to be ready
  if (!isMounted || !userLoaded) {
    return (
      <div className={`${avatarSize} rounded-full bg-muted flex items-center justify-center`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // While checking admin status, show basic UserButton
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
