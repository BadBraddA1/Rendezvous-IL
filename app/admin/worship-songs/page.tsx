import { AdminNav } from "@/components/admin/admin-nav"
import { WorshipSongsManager } from "@/components/admin/worship-songs-manager"
import { getCurrentAdmin, isAuthenticated } from "@/lib/clerk-auth"
import { redirect } from "next/navigation"

export default async function WorshipSongsAdminPage() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect("/sign-in?redirect_url=/admin/worship-songs")
  }
  const admin = await getCurrentAdmin()
  if (!admin) {
    redirect("/admin")
  }

  return (
    <div className="admin-shell">
      <AdminNav currentPage="worship-songs" admin={admin} />
      <main id="main-content" className="admin-main">
        <div className="admin-container">
          <header className="admin-page-header">
            <h1 className="text-section-title text-balance">Worship song sets</h1>
            <p className="text-lead text-muted-foreground">
              Songs and verses submitted by assigned song leaders
            </p>
          </header>
          <WorshipSongsManager />
        </div>
      </main>
    </div>
  )
}
