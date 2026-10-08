"use client"

import { AuthKitProvider } from "@braddcorp/auth"
import type { ReactNode } from "react"
import { authConfig } from "@/lib/auth-config"

export function RenAuthKitProvider({ children }: { children: ReactNode }) {
  return <AuthKitProvider config={authConfig}>{children}</AuthKitProvider>
}
