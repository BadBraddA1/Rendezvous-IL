import { redirect } from "next/navigation"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"
import { AdminNav } from "@/components/admin/admin-nav"
import { PendingChangesClient } from "./pending-changes-client"

export default async function PendingChangesPage() {
  const admin = await checkAdminAuth()

  if (!admin) {
    redirect("/sign-in?redirect_url=/admin/pending-changes")
  }

  // Fetch pending changes
  const pendingChanges = await sql`
    SELECT 
      pc.*,
      f.family_last_name,
      f.email as family_email,
      f.city,
      f.state
    FROM pending_family_changes pc
    JOIN families f ON f.id = pc.family_id
    WHERE pc.status = 'pending'
    ORDER BY pc.submitted_at DESC
  `

  // Get count for badge
  const pendingCount = pendingChanges.length

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNav admin={admin} />
      <main className="flex-1 container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pending Changes</h1>
            <p className="text-muted-foreground">
              Review and approve family profile changes
            </p>
          </div>
        </div>

        <PendingChangesClient 
          initialChanges={pendingChanges} 
          pendingCount={pendingCount}
          adminRole={admin.role}
        />
      </main>
    </div>
  )
}
