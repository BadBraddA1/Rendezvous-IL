import { AdminNav } from "@/components/admin/admin-nav"
import { FeedbackDashboard } from "@/components/admin/feedback-dashboard"
import { getCurrentAdmin, isAuthenticated } from "@/lib/clerk-auth"
import { redirect } from "next/navigation"

export default async function FeedbackPage() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect("/sign-in?redirect_url=/admin/feedback")
  }
  const admin = await getCurrentAdmin()
  if (!admin) {
    redirect("/admin")
  }

  return (
    <div className="admin-shell">
      <AdminNav currentPage="feedback" admin={admin} />
      <main id="main-content" className="admin-main">
        <div className="admin-container">
          <header className="admin-page-header">
            <h1 className="text-section-title text-balance">Event Feedback</h1>
            <p className="text-lead text-muted-foreground">Reviews and suggestions from past attendees</p>
          </header>
          <FeedbackDashboard />
        </div>
      </main>
    </div>
  )
}
