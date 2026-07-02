import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { ReactNode } from "react"
import { AdminNav } from "@/components/admin/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldAlert, LogIn, Home } from "lucide-react"
import { getAdminPermissions } from "@/lib/clerk-auth"

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

type Props = {
  currentPage: string
  path: string
  title: string
  description: string
  children: (props: { canManage: boolean }) => ReactNode
}

/** Shared auth gate + shell for the Volunteers admin pages. */
export async function VolunteerAdminShell({ currentPage, path, title, description, children }: Props) {
  const { userId } = await auth()
  const admin = await getAdminInfo()

  if (admin && !getAdminPermissions(admin.role).canViewRegistrations) {
    redirect("/admin/checkin")
  }

  if (!userId) {
    return (
      <div className="admin-gate-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <LogIn className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-subheading">Sign In Required</CardTitle>
            <CardDescription>Please sign in to manage volunteers.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href={`/sign-in?redirect_url=${encodeURIComponent(path)}`}>Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!admin) {
    return (
      <div className="admin-gate-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-7 w-7 text-destructive" />
            </div>
            <CardTitle className="text-subheading">Access Denied</CardTitle>
            <CardDescription>You don&apos;t have permission to access this page.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/account">
                <Home className="mr-2 h-4 w-4" />
                My Account
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const canManage = getAdminPermissions(admin.role).canEdit

  return (
    <div className="admin-shell">
      <AdminNav currentPage={currentPage} admin={admin} />
      <main id="main-content" className="admin-main">
        <div className="admin-container max-w-5xl space-y-6">
          <div>
            <h1 className="text-page-title">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
          {children({ canManage })}
        </div>
      </main>
    </div>
  )
}
