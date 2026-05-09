import { redirect } from "next/navigation"
import { checkAdminAuth } from "@/lib/admin-auth"
import { AdminNav } from "@/components/admin/admin-nav"
import { AuditLogs } from "@/components/admin/audit-logs"

export default async function AuditPage() {
  const admin = await checkAdminAuth()

  if (!admin) {
    redirect("/sign-in?redirect_url=/admin/audit")
  }

  // Only admins can access audit logs
  if (admin.role !== "admin") {
    redirect("/admin")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNav currentPage="audit" admin={admin} />

      <main className="flex-1 bg-background p-6">
        <div className="container mx-auto space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
            <p className="text-muted-foreground">Track all administrative actions for security and accountability</p>
          </div>

          <AuditLogs />
        </div>
      </main>
    </div>
  )
}
