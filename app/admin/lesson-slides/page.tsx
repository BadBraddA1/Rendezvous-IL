import { AdminNav } from "@/components/admin/admin-nav"
import { LessonSlidesManager } from "@/components/admin/lesson-slides-manager"
import { getCurrentAdmin, isAuthenticated } from "@/lib/clerk-auth"
import { redirect } from "next/navigation"

export default async function LessonSlidesAdminPage() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect("/sign-in?redirect_url=/admin/lesson-slides")
  }
  const admin = await getCurrentAdmin()
  if (!admin) {
    redirect("/admin")
  }

  return (
    <div className="admin-shell">
      <AdminNav currentPage="lesson-slides" admin={admin} />
      <main id="main-content" className="admin-main">
        <div className="admin-container">
          <header className="admin-page-header">
            <h1 className="text-section-title text-balance">Lesson slides</h1>
            <p className="text-lead text-muted-foreground">
              PowerPoints and PDFs submitted by lesson presenters
            </p>
          </header>
          <LessonSlidesManager canEdit={admin.role !== "viewer"} />
        </div>
      </main>
    </div>
  )
}
