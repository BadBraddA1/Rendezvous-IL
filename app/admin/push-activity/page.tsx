import { AdminNav } from "@/components/admin/admin-nav"
import { PushActivityPanel } from "@/components/admin/push-activity-panel"
import { getCurrentAdmin, isAuthenticated } from "@/lib/clerk-auth"
import { redirect } from "next/navigation"

export default async function AdminPushActivityPage() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect("/sign-in?redirect_url=/admin/push-activity")
  }

  const admin = await getCurrentAdmin()
  if (!admin) {
    redirect("/admin")
  }

  return (
    <div className="admin-shell">
      <AdminNav currentPage="push-activity" admin={admin} />
      <main id="main-content" className="admin-main">
        <div className="admin-container">
          <header className="admin-page-header">
            <h1 className="text-section-title text-balance">Push activity</h1>
            <p className="text-lead text-muted-foreground">
              Last 24 hours of outbound pushes and device token register/unregister — for debugging
              missed chat/broadcast pings across iOS and Android.
            </p>
          </header>
          <PushActivityPanel />
        </div>
      </main>
    </div>
  )
}
