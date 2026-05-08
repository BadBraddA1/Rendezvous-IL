import { AdminNav } from "@/components/admin/admin-nav"
import { SystemSettings } from "@/components/admin/system-settings"

export default async function SettingsPage() {
  const admin = {
    email: "admin@braddcorp.com",
    fullName: "Admin"
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

          <SystemSettings adminRole="admin" />
        </div>
      </main>
    </div>
  )
}
