import { Suspense } from "react"
import { AdminNav } from "@/components/admin/admin-nav"
import { CheckedInTable } from "@/components/admin/checked-in-table"
import { getCurrentAdmin, getAdminPermissions, isAuthenticated } from "@/lib/clerk-auth"
import { redirect } from "next/navigation"

export default async function CheckedInPage() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect("/sign-in?redirect_url=/admin/checked-in")
  }
  const admin = await getCurrentAdmin()
  if (!admin || !getAdminPermissions(admin.role).canCheckIn) {
    redirect("/admin")
  }

  return (
    <div className="admin-shell">
      <AdminNav currentPage="checked-in" admin={admin} />
      <main id="main-content" className="admin-main">
        <div className="admin-container">
          <header className="admin-page-header">
            <h1 className="text-section-title text-balance">Checked-In Families</h1>
            <p className="text-lead text-muted-foreground">
              Live view of families currently checked in for the selected event year
            </p>
          </header>
          <Suspense fallback={<p className="text-muted-foreground">Loading checked-in families...</p>}>
            <CheckedInTable />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
