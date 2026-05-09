import { AdminNav } from "@/components/admin/admin-nav"
import { AnnouncementsManager } from "@/components/admin/announcements-manager"
import { getCurrentAdmin, isAuthenticated } from "@/lib/clerk-auth"
import { redirect } from "next/navigation"

export default async function AnnouncementsPage() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect("/sign-in?redirect_url=/admin/announcements")
  }
  const admin = await getCurrentAdmin()
  if (!admin) {
    redirect("/admin")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNav currentPage="announcements" admin={admin} />
      <main className="flex-1 bg-background p-6">
        <div className="container mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Announcements</h2>
            <p className="text-muted-foreground">Manage live event announcements and GroupMe broadcasts</p>
          </div>
          <AnnouncementsManager canEdit={admin.role !== "viewer"} />
        </div>
      </main>
    </div>
  )
}
