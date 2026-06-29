import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { sql } from "@/lib/db"
import { enrichPendingChanges } from "@/lib/pending-family-changes"
import { getAdminPermissions } from "@/lib/clerk-auth"
import { AdminNav } from "@/components/admin/admin-nav"
import { PendingChangesClient } from "./pending-changes-client"
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

export default async function PendingChangesPage() {
  const { userId } = await auth()
  const admin = await getAdminInfo()

  if (admin && !getAdminPermissions(admin.role).canEdit) {
    redirect("/admin/checkin")
  }

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
              <Link href="/sign-in?redirect_url=/admin/pending-changes">Sign In</Link>
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

  // Fetch pending changes
  const pendingRows = await sql`
    SELECT 
      pc.*,
      f.family_last_name,
      f.email as family_email,
      f.city,
      f.state
    FROM pending_family_changes pc
    JOIN families f ON f.id = pc.family_id
    WHERE pc.status = 'pending'
    ORDER BY pc.submitted_at DESC
  `

  const pendingChanges = await enrichPendingChanges(pendingRows)
  const pendingCount = pendingChanges.length

  return (
    <div className="admin-shell">
      <AdminNav currentPage="pending-changes" admin={admin} />
      <main id="main-content" className="admin-main">
        <div className="admin-container">
          <header className="admin-page-header sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div>
              <h1 className="text-section-title text-balance tracking-tight">Pending Changes</h1>
              <p className="text-lead text-muted-foreground">
                Review and approve family profile changes
              </p>
            </div>
          </header>

          <PendingChangesClient 
            initialChanges={pendingChanges} 
            pendingCount={pendingCount}
            adminRole={admin.role}
          />
        </div>
      </main>
    </div>
  )
}
