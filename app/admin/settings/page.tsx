import { redirect } from "next/navigation"
import { checkAdminAuth } from "@/lib/admin-auth"
import { AdminNav } from "@/components/admin/admin-nav"
import { SystemSettings } from "@/components/admin/system-settings"

export default async function SettingsPage() {
  const admin = await checkAdminAuth()

  if (!admin) {
    redirect("/sign-in?redirect_url=/admin/settings")
  }

  // Only admins can access settings
  if (admin.role !== "admin") {
    redirect("/admin")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNav currentPage="settings" admin={admin} />

      <main className="flex-1 bg-background p-6">
        <div className="container mx-auto space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
            <p className="text-muted-foreground">Configure registration settings and event parameters</p>
          </div>

          <SystemSettings adminRole={admin.role} />
        </div>
      </main>
    </div>
  )
}
