"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AdminListSkeleton, AdminRetryButton } from "@/components/admin/admin-panel-states"
import type { PushActivityRow } from "@/lib/push-activity"
import { cn } from "@/lib/utils"

type Filters = {
  kind: string
  source: string
  status: string
}

function statusClass(status: string | null): string {
  switch (status) {
    case "ok":
      return "text-emerald-700"
    case "fail":
      return "text-destructive"
    case "partial":
      return "text-amber-700"
    case "skipped":
      return "text-muted-foreground"
    default:
      return "text-muted-foreground"
  }
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })
}

function shortClerk(id: string | null): string {
  if (!id) return "—"
  return id.length > 18 ? `${id.slice(0, 16)}…` : id
}

export function PushActivityPanel() {
  const [filters, setFilters] = useState<Filters>({
    kind: "summary",
    source: "all",
    status: "all",
  })
  const [events, setEvents] = useState<PushActivityRow[]>([])
  const [failuresByBatch, setFailuresByBatch] = useState<Record<string, PushActivityRow[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set("kind", filters.kind)
    params.set("source", filters.source)
    params.set("status", filters.status)
    params.set("limit", "120")
    return params.toString()
  }, [filters])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mainRes, failRes] = await Promise.all([
        fetch(`/api/admin/push-activity?${query}`),
        fetch(`/api/admin/push-activity?kind=failure&limit=200`),
      ])
      if (!mainRes.ok) throw new Error("Failed to load")
      const mainJson = (await mainRes.json()) as { events: PushActivityRow[] }
      setEvents(mainJson.events ?? [])

      if (failRes.ok) {
        const failJson = (await failRes.json()) as { events: PushActivityRow[] }
        const map: Record<string, PushActivityRow[]> = {}
        for (const row of failJson.events ?? []) {
          const list = map[row.batch_id] ?? []
          list.push(row)
          map[row.batch_id] = list
        }
        setFailuresByBatch(map)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Kind</span>
          <select
            className="h-10 rounded-md border bg-background px-3"
            value={filters.kind}
            onChange={(e) => setFilters((f) => ({ ...f, kind: e.target.value }))}
          >
            <option value="summary">Summaries</option>
            <option value="failure">Failures</option>
            <option value="register">Registers</option>
            <option value="unregister">Unregisters</option>
            <option value="all">All</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Source</span>
          <select
            className="h-10 rounded-md border bg-background px-3"
            value={filters.source}
            onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}
          >
            <option value="all">All</option>
            <option value="chat">Chat</option>
            <option value="chat_reaction">Reaction</option>
            <option value="broadcast">Broadcast</option>
            <option value="register">Register</option>
            <option value="unregister">Unregister</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Status</span>
          <select
            className="h-10 rounded-md border bg-background px-3"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="all">All</option>
            <option value="ok">OK</option>
            <option value="partial">Partial</option>
            <option value="fail">Fail</option>
            <option value="skipped">Skipped</option>
          </select>
        </label>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Kept ~24 hours. Summaries for every send; per-device rows only when APNs/FCM fails.
        Token prefixes only — never full device tokens.
      </p>

      {loading && events.length === 0 ? <AdminListSkeleton rows={6} /> : null}
                {error ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{error}</p>
              <AdminRetryButton onRetry={() => void load()} />
            </div>
          ) : null}

      {!loading && !error && events.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No push activity in the last 24 hours for these filters.
          </CardContent>
        </Card>
      ) : null}

      <ul className="space-y-2">
        {events.map((row) => {
          const fails = failuresByBatch[row.batch_id] ?? []
          const open = Boolean(expanded[row.id])
          return (
            <li key={row.id}>
              <Card>
                <CardContent className="space-y-2 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">{row.source}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{row.kind}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className={cn("font-medium", statusClass(row.status))}>
                          {row.status ?? "—"}
                        </span>
                        {row.platform ? (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.platform}</span>
                        ) : null}
                      </div>
                      {(row.title || row.body_preview) && (
                        <p className="text-sm">
                          {row.title ? <span className="font-medium">{row.title}</span> : null}
                          {row.title && row.body_preview ? " — " : null}
                          {row.body_preview}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatWhen(row.created_at)}
                        {row.attempted != null
                          ? ` · ${row.succeeded ?? 0}/${row.attempted} ok · ${row.failed ?? 0} fail`
                          : null}
                        {row.sandbox_count != null || row.production_count != null
                          ? ` · ios env sand=${row.sandbox_count ?? 0} prod=${row.production_count ?? 0}`
                          : null}
                        {row.channel_id ? ` · channel ${row.channel_id}` : null}
                        {row.token_prefix ? ` · token ${row.token_prefix}…` : null}
                        {row.clerk_user_id ? ` · ${shortClerk(row.clerk_user_id)}` : null}
                        {row.environment ? ` · ${row.environment}` : null}
                        {row.reason ? ` · ${row.reason}` : null}
                      </p>
                    </div>
                    {row.kind === "summary" && fails.length > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpanded((e) => ({ ...e, [row.id]: !e[row.id] }))
                        }
                      >
                        {fails.length} failure{fails.length === 1 ? "" : "s"}
                        {open ? (
                          <ChevronUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ChevronDown className="ml-1 h-4 w-4" />
                        )}
                      </Button>
                    ) : null}
                  </div>
                  {open && fails.length > 0 ? (
                    <ul className="space-y-1 border-t pt-2 text-xs">
                      {fails.map((f) => (
                        <li key={f.id} className="text-destructive">
                          {f.platform}
                          {f.environment ? `/${f.environment}` : ""} · {shortClerk(f.clerk_user_id)} ·{" "}
                          {f.token_prefix}… · {f.reason || "failed"}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
