import { AdminNav } from "@/components/admin/admin-nav"
import { CheckinStation } from "@/components/admin/checkin-station"
import { getCurrentAdmin, isAuthenticated } from "@/lib/clerk-auth"
import { redirect } from "next/navigation"

export default async function CheckinPage() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect("/sign-in?redirect_url=/admin/checkin")
  }
  const admin = await getCurrentAdmin()
  if (!admin) {
    redirect("/admin")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNav currentPage="checkin" admin={admin} />
      <main id="main-content" className="flex-1 bg-background p-6">
        <div className="container mx-auto max-w-5xl space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Check-In Station</h2>
            <p className="text-muted-foreground">Scan a QR code, enter a code, or search by name</p>
          </div>
          <CheckinStation />
        </div>
      </main>
    </div>
  )
}
