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
    <div className="admin-shell">
      <AdminNav currentPage="announcements" admin={admin} />
      <main id="main-content" className="admin-main">
        <div className="admin-container">
          <header className="admin-page-header">
            <h1 className="text-section-title text-balance">Announcements</h1>
            <p className="text-lead text-muted-foreground">Manage live event announcements and GroupMe broadcasts</p>
          </header>
          <AnnouncementsManager canEdit={admin.role !== "viewer"} />
        </div>
      </main>
    </div>
  )
}
