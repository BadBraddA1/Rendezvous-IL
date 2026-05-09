import { auth, currentUser } from "@clerk/nextjs/server"
import { sql } from "@/lib/db"
import { AdminNav } from "@/components/admin/admin-nav"
import { PendingChangesClient } from "./pending-changes-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldAlert, LogIn, Home } from "lucide-react"
import Link from "next/link"

type AdminRole = "admin" | "editor" | "viewer"

async function getAdminInfo() {
  const { userId } = await auth()
  if (!userId) return null

  const user = await currentUser()
  if (!user) return null

  const publicMetadata = user.publicMetadata as { role?: string } | undefined
  const role = publicMetadata?.role as AdminRole | undefined

  if (!role || !["admin", "editor", "viewer"].includes(role)) {
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

  // Not logged in
  if (!userId) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <LogIn className="h-7 w-7 text-primary" />
            </div>
            <CardTitle>Sign In Required</CardTitle>
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
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-7 w-7 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
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
  const pendingChanges = await sql`
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

  const pendingCount = pendingChanges.length

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNav currentPage="pending-changes" admin={admin} />
      <main className="flex-1 container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pending Changes</h1>
            <p className="text-muted-foreground">
              Review and approve family profile changes
            </p>
          </div>
        </div>

        <PendingChangesClient 
          initialChanges={pendingChanges} 
          pendingCount={pendingCount}
          adminRole={admin.role}
        />
      </main>
    </div>
  )
}
