"use client"

import Link from "next/link"
import useSWR from "swr"
import { Suspense } from "react"
import { AdminStat, AdminStatStrip } from "@/components/admin/admin-stat"
import { useAdminEventYear } from "@/components/admin/admin-event-year-switcher"
import { adminDashConfig } from "@/lib/admin-dash-config"
import {
  ARCHIVE_REGISTRATION_EVENT_YEAR,
  DEFAULT_REGISTRATION_EVENT_YEAR,
  registrationYearLabel,
} from "@/lib/registration-event-years"
import type { AdminDashboardSummary } from "@/lib/admin-dashboard-summary"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type DashboardResponse = {
  summary: AdminDashboardSummary
  registrationProgress: number
}

/** Overview quick links that aren't already in the primary "Jump in" grid. */
const OVERVIEW_EXTRA_LINKS = [
  { href: "/admin/settings", label: "Settings", hint: "Directory + registration previews" },
  { href: "/admin/rates", label: "Rates", hint: "Lodging & fee chart" },
  { href: "/admin/calculator", label: "Calculator", hint: "Test rate totals" },
  { href: "/admin/directory", label: "Family Directory", hint: "Edit public listings" },
  { href: "/admin/pending-changes", label: "Pending changes", hint: "Approve profile edits" },
  { href: "/admin/feedback", label: "Feedback", hint: "Event ratings" },
] as const

function AdminNewOverviewInner() {
  const { eventYear } = useAdminEventYear()
  const { data: me } = useSWR<{
    staff: { fullName: string | null; role: string; permissions: Record<string, boolean> }
  }>("/api/admin/me", fetcher)

  const { data, error, isLoading } = useSWR<DashboardResponse>(
    `/api/admin/dashboard?year=${eventYear}`,
    fetcher,
    { refreshInterval: 60_000 },
  )

  const summary = data?.summary
  const progress = data?.registrationProgress ?? 0
  const isArchive = eventYear === ARCHIVE_REGISTRATION_EVENT_YEAR
  const isAdmin = me?.staff?.role === "admin"

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
          {isArchive ? (
            <>
              Viewing <strong>{registrationYearLabel(eventYear)} archive</strong> — use the year
              control in the header to return to {DEFAULT_REGISTRATION_EVENT_YEAR}.
            </>
          ) : (
            <>
              Primary season: <strong>{registrationYearLabel(eventYear)}</strong>. Use the header
              year control to open the 2026 archive when you need last year&apos;s data.
            </>
          )}
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive">Could not load dashboard stats. Try refreshing.</p>
      )}

      <AdminStatStrip>
        <AdminStat
          label="Registrations"
          value={isLoading ? "…" : (summary?.registrations ?? "—")}
          hint={
            summary
              ? `${Math.round(progress)}% of ${summary.registrationGoal} goal`
              : "Families registered"
          }
        />
        <AdminStat
          label="Attendees"
          value={isLoading ? "…" : (summary?.registeredAttendees ?? "—")}
          hint="On registration cards"
        />
        <AdminStat
          label="Revenue"
          value={
            isLoading
              ? "…"
              : summary
                ? `$${summary.totalRevenue.toLocaleString()}`
                : "—"
          }
          hint={
            summary
              ? `$${summary.balanceDue.toLocaleString()} balance due`
              : "Lodging + fees"
          }
        />
        <AdminStat
          label="New / returning"
          value={
            isLoading
              ? "…"
              : summary
                ? `${summary.newFamilies} / ${summary.returningFamilies}`
                : "—"
          }
          hint="Families for this year"
        />
      </AdminStatStrip>

      {summary && (
        <div className="grid gap-3 lg:grid-cols-2">
          <section className="ad-panel p-3">
            <h2 className="text-sm font-semibold">Lodging · {eventYear}</h2>
            <p className="mt-1 text-xs" style={{ color: "var(--ad-muted)" }}>
              Motel {summary.lodgingBreakdown.motel} · RV {summary.lodgingBreakdown.rv} · Tent{" "}
              {summary.lodgingBreakdown.tent} · Drive-in {summary.lodgingBreakdown.drivein}
            </p>
            <p className="mt-2 text-xs" style={{ color: "var(--ad-muted)" }}>
              Express {summary.expressRegistrations} · Checked in {summary.checkedIn}
            </p>
          </section>

          <section className="ad-panel p-3">
            <h2 className="text-sm font-semibold">Payments · {eventYear}</h2>
            <p className="mt-1 text-xs" style={{ color: "var(--ad-muted)" }}>
              Paid in full {summary.fullyPaid} · Deposit only{" "}
              {Math.max(0, summary.registrations - summary.fullyPaid)}
            </p>
            <p className="mt-2 text-xs" style={{ color: "var(--ad-muted)" }}>
              Deposits ${summary.depositsPaid.toLocaleString()} · Balance $
              {summary.balanceDue.toLocaleString()}
            </p>
          </section>

          <section className="ad-panel p-3">
            <h2 className="text-sm font-semibold">Action items</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>
                <Link
                  href="/admin/pending-changes"
                  className="flex items-center justify-between gap-2 hover:underline"
                >
                  <span>Pending family changes</span>
                  <span className="tabular-nums font-medium">{summary.pendingChanges}</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/announcements"
                  className="flex items-center justify-between gap-2 hover:underline"
                >
                  <span>Active announcements</span>
                  <span className="tabular-nums font-medium">{summary.activeAnnouncements}</span>
                </Link>
              </li>
              <li>
                <Link
                  href={`/admin/feedback?year=${eventYear}`}
                  className="flex items-center justify-between gap-2 hover:underline"
                >
                  <span>{eventYear} feedback</span>
                  <span className="tabular-nums font-medium">
                    {summary.feedbackCount}
                    {summary.avgRating > 0 ? ` · ${summary.avgRating.toFixed(1)}★` : ""}
                  </span>
                </Link>
              </li>
            </ul>
          </section>

          <section className="ad-panel p-3">
            <h2 className="text-sm font-semibold">Season controls</h2>
            <p className="mt-1 text-xs" style={{ color: "var(--ad-muted)" }}>
              Family Directory visibility, registration previews, and signature emails live in
              Settings (same toggles as the classic home).
            </p>
            {isAdmin ? (
              <Link
                href="/admin/settings"
                className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
              >
                Open Settings
              </Link>
            ) : (
              <p className="mt-2 text-xs" style={{ color: "var(--ad-muted)" }}>
                Only admins can change those toggles.
              </p>
            )}
          </section>
        </div>
      )}

      <section className="ad-panel p-3">
        <h2 className="text-sm font-semibold">Quick actions</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {OVERVIEW_EXTRA_LINKS.filter((link) => {
            if (link.href === "/admin/settings" || link.href === "/admin/rates" || link.href === "/admin/calculator") {
              return isAdmin
            }
            return true
          }).map((link) => (
            <Link
              key={link.href}
              href={link.href.includes("?") ? link.href : `${link.href}?year=${eventYear}`}
              className="rounded-md border px-3 py-2 text-sm transition hover:border-primary/40"
              style={{ borderColor: "var(--ad-line)" }}
            >
              <p className="font-semibold">{link.label}</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--ad-muted)" }}>
                {link.hint}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="ad-panel p-3">
        <h2 className="text-sm font-semibold">Jump in</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {quick.map((q) => (
            <Link
              key={q.href}
              href={`${q.href}?year=${eventYear}`}
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
    </div>
  )
}

/**
 * New dash overview — 2027 is the primary season; header year switcher jumps to 2026 archive.
 * Config toggles (directory / registration previews) live under Settings.
 */
export default function AdminNewOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm" style={{ color: "var(--ad-muted)" }}>
          Loading overview…
        </div>
      }
    >
      <AdminNewOverviewInner />
    </Suspense>
  )
}
