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
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main
        id="main-content"
        className="site-container site-below-header-loose site-page-intro pb-16 md:pb-20"
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
