import type React from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export const metadata = {
  title: "My Account - Rendezvous IL",
  description: "Manage your family profile and view your registration history.",
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 pt-20">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
