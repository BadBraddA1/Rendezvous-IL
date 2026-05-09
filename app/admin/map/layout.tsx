import type React from "react"
import { redirect } from "next/navigation"
import { AdminNav } from "@/components/admin/admin-nav"
import { checkAdminAuth } from "@/lib/admin-auth"

export default async function AdminMapLayout({ children }: { children: React.ReactNode }) {
  const admin = await checkAdminAuth()

  if (!admin) {
    redirect("/sign-in?redirect_url=/admin/map")
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="map" admin={admin} />
      {children}
    </div>
  )
}
