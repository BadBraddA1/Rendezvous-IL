import type React from "react"
import { auth, currentUser } from "@clerk/nextjs/server"
import { AdminNav } from "@/components/admin/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldAlert, LogIn, Home } from "lucide-react"
import Link from "next/link"

type AdminRole = "admin" | "editor" | "viewer" | "checkin"

async function getAdminInfo() {
  const { userId } = await auth()
  if (!userId) return null

  const user = await currentUser()
  if (!user) return null

  const publicMetadata = user.publicMetadata as { role?: string } | undefined
  const role = publicMetadata?.role as AdminRole | undefined

  if (!role || !(role === "admin" || role === "editor" || role === "viewer" || role === "checkin")) {
    return null
  }

  return {
    email: user.emailAddresses[0]?.emailAddress || "",
    fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Admin",
    role: role as AdminRole,
  }
}

export default async function AdminMapLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  const admin = await getAdminInfo()

  // Not logged in
  if (!userId) {
    return (
      <div className="admin-gate-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <LogIn className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-subheading">Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/sign-in?redirect_url=/admin/map">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Logged in but not admin
  if (!admin) {
    return (
      <div className="admin-gate-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-7 w-7 text-destructive" />
            </div>
            <CardTitle className="text-subheading">Access Denied</CardTitle>
            <CardDescription>
              You don&apos;t have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/account">
                <Home className="h-4 w-4 mr-2" />
                My Account
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <AdminNav currentPage="map" admin={admin} />
      {children}
    </div>
  )
}
