"use client"

import { createContext, useContext, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { AdminShell } from "@/components/admin/admin-shell"
import type { AdminUiMode } from "@/lib/admin-ui-mode"

const AdminUiModeContext = createContext<AdminUiMode>("classic")

export function useAdminUiMode(): AdminUiMode {
  return useContext(AdminUiModeContext)
}

const BARE_PREFIXES = ["/admin/login", "/admin/setup", "/admin/change-password"]

function isBareAdminPath(pathname: string) {
  return BARE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * When `ren_admin_ui=new`, keep the sidebar shell on every admin page
 * until the user flips back to Classic.
 */
export function AdminChrome({
  mode,
  children,
}: {
  mode: AdminUiMode
  children: ReactNode
}) {
  const pathname = usePathname() || "/admin"
  const bare = isBareAdminPath(pathname)
  const useShell = mode === "new" && !bare

  return (
    <AdminUiModeContext.Provider value={mode}>
      {useShell ? <AdminShell>{children}</AdminShell> : children}
    </AdminUiModeContext.Provider>
  )
}
