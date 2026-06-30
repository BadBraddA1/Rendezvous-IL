"use client"

import { Suspense } from "react"
import { LiveUpdatesShell } from "@/components/live-updates/live-updates-shell"

export default function LiveUpdatesPage() {
  return (
    <Suspense fallback={null}>
      <LiveUpdatesShell />
    </Suspense>
  )
}
