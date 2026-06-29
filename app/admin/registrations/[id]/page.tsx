import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AdminNav } from "@/components/admin/admin-nav"
import { RegistrationEditForm } from "@/components/admin/registration-edit-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldAlert, LogIn, Home } from "lucide-react"
import { getAdminPermissions } from "@/lib/clerk-auth"
import { parseLegacyRegistrationId } from "@/lib/admin-registration-queries"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

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

export default async function RegistrationEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ year?: string }>
}) {
  const { userId } = await auth()
  const admin = await getAdminInfo()
  const { id } = await params
  const { year } = await searchParams
  const eventYear = parseRegistrationEventYear(year)
  const legacyId = parseLegacyRegistrationId(id)

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
            <CardDescription>Please sign in to edit registrations.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href={`/sign-in?redirect_url=/admin/registrations/${id}?year=${eventYear}`}>
                Sign In
              </Link>
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

  if (!legacyId) {
    return (
      <div className="admin-shell">
        <AdminNav currentPage="registrations" admin={admin} />
        <main id="main-content" className="admin-main">
          <div className="admin-container max-w-2xl py-12">
            <Card>
              <CardHeader>
                <CardTitle>Family registration</CardTitle>
                <CardDescription>
                  This {eventYear} registration comes from the family account system and is not edited on this page yet.
                  Use Pending Changes or the family profile for updates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href={`/admin/registrations?year=${eventYear}`}>Back to registrations</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <AdminNav currentPage="registrations" admin={admin} />
      <main id="main-content" className="admin-main">
        <div className="admin-container max-w-5xl">
          <RegistrationEditForm registrationId={legacyId} eventYear={eventYear} />
        </div>
      </main>
    </div>
  )
}
