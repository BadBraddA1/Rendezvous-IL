import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { RegistrationsTable } from "@/components/admin/registrations-table"
import { AdminNav } from "@/components/admin/admin-nav"

export default async function RegistrationsPage() {
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
      <AdminNav currentPage="registrations" admin={admin} />

      <main className="flex-1 bg-background p-6">
        <div className="container mx-auto space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Registration Management</h2>
            <p className="text-muted-foreground">View, search, and manage all event registrations</p>
          </div>

          <RegistrationsTable />
        </div>
      </main>
    </div>
  )
}
