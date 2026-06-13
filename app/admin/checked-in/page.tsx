import { AdminNav } from "@/components/admin/admin-nav"
import { CheckedInTable } from "@/components/admin/checked-in-table"
import { getCurrentAdmin, isAuthenticated } from "@/lib/clerk-auth"
import { redirect } from "next/navigation"

export default async function CheckedInPage() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect("/sign-in?redirect_url=/admin/checked-in")
  }
  const admin = await getCurrentAdmin()
  if (!admin) {
    redirect("/admin")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNav currentPage="checked-in" admin={admin} />
      <main id="main-content" className="flex-1 bg-background p-6">
        <div className="container mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Checked-In Families</h2>
            <p className="text-muted-foreground">Live view of families currently checked in</p>
          </div>
          <CheckedInTable />
        </div>
      </main>
    </div>
  )
}
