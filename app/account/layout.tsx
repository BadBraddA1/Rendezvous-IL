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
      <main id="main-content" className="flex-1 pt-20 md:pt-24">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
