import type { Metadata } from "next"
import type { ReactNode } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ADMIN_UI_COOKIE, parseAdminUiMode } from "@/lib/admin-ui-mode"

export const metadata: Metadata = {
  title: "Staff admin (new) — Rendezvous IL",
  robots: { index: false, follow: false },
}

/** Overview route only — shell comes from app/admin/layout.tsx when mode=new. */
export default async function AdminNewLayout({ children }: { children: ReactNode }) {
  const jar = await cookies()
  if (parseAdminUiMode(jar.get(ADMIN_UI_COOKIE)?.value) === "classic") {
    redirect("/admin")
  }
  return children
}
