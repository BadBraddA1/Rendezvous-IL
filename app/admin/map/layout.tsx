import type React from "react"
import { AdminNav } from "@/components/admin/admin-nav"

export default async function AdminMapLayout({ children }: { children: React.ReactNode }) {
  const admin = {
    email: "admin@braddcorp.com",
    fullName: "Admin"
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="map" admin={admin} />
      {children}
    </div>
  )
}
