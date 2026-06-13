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
    <div className="flex min-h-screen flex-col">
      <AdminNav currentPage="feedback" admin={admin} />
      <main id="main-content" className="flex-1 bg-background p-6">
        <div className="container mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Event Feedback</h2>
            <p className="text-muted-foreground">Reviews and suggestions from past attendees</p>
          </div>
          <FeedbackDashboard />
        </div>
      </main>
    </div>
  )
}
