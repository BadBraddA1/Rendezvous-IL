import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { AdminNav } from "@/components/admin/admin-nav"
import { AuditLogs } from "@/components/admin/audit-logs"

export default async function AuditPage() {
  const user = await currentUser()

  if (!user) {
    redirect("/sign-in")
  }

  const admin = {
    email: user.emailAddresses[0]?.emailAddress || "admin@braddcorp.com",
    fullName: user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Admin"
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
