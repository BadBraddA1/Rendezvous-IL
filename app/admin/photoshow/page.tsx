import { AdminNav } from "@/components/admin/admin-nav"
import { PhotoshowManager } from "@/components/admin/photoshow-manager"
import { getCurrentAdmin, isAuthenticated } from "@/lib/clerk-auth"
import { redirect } from "next/navigation"

export default async function PhotoshowAdminPage() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect("/sign-in?redirect_url=/admin/photoshow")
  }
  const admin = await getCurrentAdmin()
  if (!admin) {
    redirect("/admin")
  }

  return (
    <div className="admin-shell">
      <AdminNav currentPage="photoshow" admin={admin} />
      <main id="main-content" className="admin-main">
        <div className="admin-container">
          <header className="admin-page-header">
            <h1 className="text-section-title text-balance">Photoshow</h1>
            <p className="text-lead text-muted-foreground">
              Slideshow photos for Live Updates and room TV screens
            </p>
          </header>
          <PhotoshowManager canEdit={admin.role !== "viewer"} />
        </div>
      </main>
    </div>
  )
}
