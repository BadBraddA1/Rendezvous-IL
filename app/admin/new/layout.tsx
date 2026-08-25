import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AdminShell } from "@/components/admin/admin-shell"
import { adminDashConfig } from "@/lib/admin-dash-config"
import { ADMIN_UI_COOKIE, parseAdminUiMode } from "@/lib/admin-ui-mode"
import { getCurrentAdmin, isAuthenticated } from "@/lib/clerk-auth"
import "@/app/admin-dash.css"

export const metadata: Metadata = {
  title: "Staff admin (new) — Rendezvous IL",
  robots: { index: false, follow: false },
}

export default async function AdminNewLayout({ children }: { children: ReactNode }) {
  const jar = await cookies()
  const mode = parseAdminUiMode(jar.get(ADMIN_UI_COOKIE)?.value)
  if (mode === "classic") {
    redirect("/admin")
  }

  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect(`${adminDashConfig.signInUrl}?redirect_url=/admin/new`)
  }

  const admin = await getCurrentAdmin()
  if (!admin) {
    return (
      <div className="ad-page flex flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-xl font-semibold">Staff role required</h1>
        <p className="max-w-md text-sm" style={{ color: "var(--ad-muted)" }}>
          You&apos;re signed in, but this account isn&apos;t an admin. Ask a full admin to set your
          Clerk role.
        </p>
        <Link href="/" className="text-sm underline underline-offset-2">
          Back to site
        </Link>
      </div>
    )
  }

  return <AdminShell>{children}</AdminShell>
}
