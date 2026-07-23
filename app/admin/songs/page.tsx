import { AdminNav } from "@/components/admin/admin-nav"
import { SongPacksManager } from "@/components/admin/song-packs-manager"
import { getCurrentAdmin, isAuthenticated } from "@/lib/clerk-auth"
import { redirect } from "next/navigation"

export default async function SongsAdminPage() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect("/sign-in?redirect_url=/admin/songs")
  }
  const admin = await getCurrentAdmin()
  if (!admin) {
    redirect("/admin")
  }

  return (
    <div className="admin-shell">
      <AdminNav currentPage="songs" admin={admin} />
      <main id="main-content" className="admin-main">
        <div className="admin-container">
          <header className="admin-page-header">
            <h1 className="text-section-title text-balance">Songs</h1>
            <p className="text-lead text-muted-foreground">
              Campfire and racket ball song packs for phones (offline downloads)
            </p>
          </header>
          <SongPacksManager canEdit={admin.role !== "viewer"} />
        </div>
      </main>
    </div>
  )
}
