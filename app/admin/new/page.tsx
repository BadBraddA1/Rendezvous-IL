"use client"

import Link from "next/link"
import useSWR from "swr"
import { AdminStat, AdminStatStrip } from "@/components/admin/admin-stat"
import { adminDashConfig } from "@/lib/admin-dash-config"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/**
 * New dash overview — dense shell; stats still wire up as we migrate pages.
 * Links into existing classic feature routes (same APIs).
 */
export default function AdminNewOverviewPage() {
  const { data: me } = useSWR<{
    staff: { fullName: string | null; role: string; permissions: Record<string, boolean> }
  }>("/api/admin/me", fetcher)

  const quick = adminDashConfig.nav.filter((n) => {
    if (n.href === "/admin/new") return false
    return me?.staff?.permissions?.[n.permission] !== false
  })

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">
          {me?.staff?.fullName ? `Welcome, ${me.staff.fullName}` : "Overview"}
        </h1>
        <p className="text-xs" style={{ color: "var(--ad-muted)" }}>
          New staff shell (LECYC / Camp Ruby template). Feature pages still open in the shared
          routes — use <strong>Classic</strong> anytime if something looks off.
        </p>
      </div>

      <AdminStatStrip>
        <AdminStat label="Dashboard" value="New" hint="Toggle in sidebar" />
        <AdminStat label="Role" value={me?.staff?.role ?? "—"} />
        <AdminStat label="Routes" value={quick.length} hint="In this nav" />
      </AdminStatStrip>

      <section className="ad-panel p-3">
        <h2 className="text-sm font-semibold">Jump in</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {quick.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="rounded-md border px-3 py-2 text-sm transition hover:border-primary/40"
              style={{ borderColor: "var(--ad-line)" }}
            >
              <p className="font-semibold">{q.label}</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--ad-muted)" }}>
                {q.href}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <p className="text-xs" style={{ color: "var(--ad-muted)" }}>
        Prefer the old top-nav dashboard? Switch to <strong>Classic</strong> in the sidebar — your
        choice is saved for next time.
      </p>
    </div>
  )
}
