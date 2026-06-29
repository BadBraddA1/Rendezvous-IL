import { AdminNav } from "@/components/admin/admin-nav"
import { CheckinStation } from "@/components/admin/checkin-station"
import { getCurrentAdmin, getAdminPermissions, isAuthenticated } from "@/lib/clerk-auth"
import { redirect } from "next/navigation"

export default async function CheckinPage() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect("/sign-in?redirect_url=/admin/checkin")
  }
  const admin = await getCurrentAdmin()
  if (!admin || !getAdminPermissions(admin.role).canCheckIn) {
    redirect("/admin")
  }

  return (
    <div className="admin-shell">
      <AdminNav currentPage="checkin" admin={admin} />
      <main id="main-content" className="admin-main">
        <div className="admin-container admin-container--compact">
          <header className="admin-page-header">
            <h1 className="text-section-title text-balance">Check-In Station</h1>
            <p className="text-lead text-muted-foreground">Scan a QR code, enter a code, or search by name</p>
          </header>
          <CheckinStation />
        </div>
      </main>
    </div>
  )
}
