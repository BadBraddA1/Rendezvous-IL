import { AdminNav } from "@/components/admin/admin-nav"
import { DisplaysClient } from "./displays-client"
import { getCurrentAdmin, getAdminPermissions, isAuthenticated } from "@/lib/clerk-auth"
import { redirect } from "next/navigation"

export default async function AdminDisplaysPage() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect("/sign-in?redirect_url=/admin/displays")
  }

  const admin = await getCurrentAdmin()
  if (!admin || !getAdminPermissions(admin.role).canViewRegistrations) {
    redirect("/admin")
  }

  return (
    <div className="admin-shell">
      <AdminNav currentPage="displays" admin={admin} />
      <main id="main-content" className="admin-main">
        <div className="admin-container">
          <DisplaysClient />
        </div>
      </main>
    </div>
  )
}
