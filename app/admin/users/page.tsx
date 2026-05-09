import { redirect } from "next/navigation"
import { AdminNav } from "@/components/admin/admin-nav"
import { getCurrentAdmin } from "@/lib/clerk-auth"
import { UsersClient } from "./users-client"

export default async function AdminUsersPage() {
  const admin = await getCurrentAdmin()

  if (!admin) {
    redirect("/sign-in?redirect_url=/admin/users")
  }

  // Only admins can manage users
  if (admin.role !== "admin") {
    redirect("/admin")
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminNav currentPage="users" admin={admin} />
      <main className="container py-8">
        <UsersClient />
      </main>
    </div>
  )
}
