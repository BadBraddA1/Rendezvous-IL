import type React from "react"
import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { AdminNav } from "@/components/admin/admin-nav"

export default async function AdminMapLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()

  if (!user) {
    redirect("/sign-in")
  }

  const admin = {
    email: user.emailAddresses[0]?.emailAddress || "admin@braddcorp.com",
    fullName: user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Admin"
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="map" admin={admin} />
      {children}
    </div>
  )
}
