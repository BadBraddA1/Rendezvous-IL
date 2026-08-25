import type React from "react"
import { Inter } from "next/font/google"
import { cookies } from "next/headers"
import { AdminChrome } from "@/components/admin/admin-chrome"
import { ADMIN_UI_COOKIE, parseAdminUiMode } from "@/lib/admin-ui-mode"
import "@/app/admin-dash.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Admin Dashboard - Rendezvous IL",
  description: "Manage event registrations and settings",
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const jar = await cookies()
  const mode = parseAdminUiMode(jar.get(ADMIN_UI_COOKIE)?.value)

  return (
    <div className={inter.className}>
      <AdminChrome mode={mode}>{children}</AdminChrome>
    </div>
  )
}
