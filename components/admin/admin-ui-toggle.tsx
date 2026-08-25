"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import type { AdminUiMode } from "@/lib/admin-ui-mode"

/** Sticky New / Classic dash switch (cookie `ren_admin_ui`). */
export function AdminUiToggle({ mode }: { mode: AdminUiMode }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function setMode(next: AdminUiMode) {
    if (next === mode || pending) return
    startTransition(async () => {
      await fetch("/api/admin/ui-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      })
      router.push(next === "new" ? "/admin/new" : "/admin")
      router.refresh()
    })
  }

  return (
    <div
      className="inline-flex items-center rounded-md border border-border bg-background p-0.5 text-xs"
      role="group"
      aria-label="Admin dashboard version"
    >
      <button
        type="button"
        disabled={pending}
        onClick={() => setMode("classic")}
        className={`rounded px-2 py-1 ${
          mode === "classic" ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground"
        }`}
      >
        Classic
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setMode("new")}
        className={`rounded px-2 py-1 ${
          mode === "new" ? "bg-primary/15 font-semibold text-primary" : "text-muted-foreground"
        }`}
      >
        New dash
      </button>
    </div>
  )
}
