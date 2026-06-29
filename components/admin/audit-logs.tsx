"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Download,
  FileEdit,
  LogOut,
  MapPin,
  RefreshCw,
  RotateCcw,
  Settings,
  Shield,
  UserCog,
  XCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AuditLogEntry } from "@/lib/audit-logs"
import {
  AUDIT_CATEGORY_FILTERS,
  auditActionCategory,
  humanizeAuditKey,
  publicAuditMetadata,
  resolveAuditAction,
  resolveAuditActorName,
} from "@/lib/audit-display"
import { AdminListSkeleton, AdminRetryButton } from "./admin-panel-states"
import { cn } from "@/lib/utils"
import {
  centralDateKey,
  formatAuditDetailTimestamp,
  formatAuditGroupLabel,
  formatAuditListTimestamp,
  parseDbTimestamp,
} from "@/lib/db-timestamp"

function groupByDate(logs: AuditLogEntry[]): { label: string; logs: AuditLogEntry[] }[] {
  const groups = new Map<string, AuditLogEntry[]>()

  for (const log of logs) {
    const date = parseDbTimestamp(log.createdAt)
    const sortKey = date ? centralDateKey(date) : formatAuditGroupLabel(log.createdAt)

    if (!groups.has(sortKey)) {
      groups.set(sortKey, [])
    }
    groups.get(sortKey)!.push(log)
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([, groupedLogs]) => ({
      label: formatAuditGroupLabel(groupedLogs[0]?.createdAt ?? ""),
      logs: groupedLogs,
    }))
}

function resolveAuditActionIcon(action: string): LucideIcon {
  if (action.includes("approve")) return CheckCircle2
  if (action.includes("reject") || action.includes("failed")) return XCircle
  if (action.includes("export")) return Download
  if (action.includes("check_in") && !action.includes("undo")) return ClipboardCheck
  if (action.includes("undo_check")) return RotateCcw
  if (action.includes("directory")) return MapPin
  if (action.includes("settings")) return Settings
  if (action.includes("user_role")) return UserCog
  if (action.includes("password")) return Shield
  if (action.includes("logout")) return LogOut
  if (action.includes("pending")) return FileEdit
  return Shield
}

function MetadataChanges({ meta }: { meta: Record<string, unknown> }) {
  const from = meta.from as Record<string, unknown> | undefined
  const to = meta.to as Record<string, unknown> | undefined

  if (from && to) {
    const changedKeys = Object.keys(to).filter(
      (key) => JSON.stringify(from[key]) !== JSON.stringify(to[key]),
    )
    if (changedKeys.length === 0) {
      return <span className="audit-detail__no-changes">No fields changed</span>
    }
    return (
      <div className="audit-detail__changes">
        {changedKeys.map((key) => (
          <div key={key} className="audit-detail__change-row">
            <span className="audit-detail__field-name">{humanizeAuditKey(key)}</span>
            <span className="audit-detail__old-val">{String(from[key] ?? "—")}</span>
            <span className="audit-detail__arrow">→</span>
            <span className="audit-detail__new-val">{String(to[key] ?? "—")}</span>
          </div>
        ))}
      </div>
    )
  }

  const entries = Object.entries(meta).filter(([key]) => key !== "from" && key !== "to")
  if (entries.length === 0) return null

  return (
    <div className="audit-detail__kv">
      {entries.map(([key, value]) => (
        <div key={key} className="audit-detail__kv-row">
          <span className="audit-detail__field-name">{humanizeAuditKey(key)}</span>
          <span className="audit-detail__field-value">
            {typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}
          </span>
        </div>
      ))}
    </div>
  )
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [category, setCategory] = useState("")
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (category.trim()) params.set("action", category.trim())

      if (dateRange !== "all") {
        const now = new Date()
        const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90
        const from = new Date(now.getTime() - days * 86400000)
        params.set("from", from.toISOString())
      }

      params.set("limit", "200")
      const res = await fetch(`/api/admin/audit?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load audit logs")
      setLogs(Array.isArray(data.logs) ? data.logs : [])
    } catch (err) {
      setLogs([])
      setError(err instanceof Error ? err.message : "Failed to load audit logs")
    } finally {
      setLoading(false)
    }
  }, [category, dateRange])

  useEffect(() => {
    void load()
  }, [load])

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs
    const q = search.toLowerCase()
    return logs.filter(
      (log) =>
        log.action.toLowerCase().includes(q) ||
        resolveAuditActorName(log).toLowerCase().includes(q) ||
        resolveAuditAction(log.action).label.toLowerCase().includes(q) ||
        (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(q)) ||
        (log.resourceType && log.resourceType.toLowerCase().includes(q)) ||
        (log.resourceId && log.resourceId.toLowerCase().includes(q)),
    )
  }, [logs, search])

  const grouped = useMemo(() => groupByDate(filteredLogs), [filteredLogs])

  const categoryCounts = useMemo(() => {
    const counts = { profile: 0, directory: 0, registration: 0, settings: 0, admin: 0 }
    for (const log of logs) {
      const cat = auditActionCategory(log.action)
      if (cat in counts) counts[cat as keyof typeof counts] += 1
    }
    return counts
  }, [logs])

  const uniqueActors = useMemo(() => {
    const actors = new Set<string>()
    for (const log of logs) {
      if (log.adminEmail) actors.add(log.adminEmail)
    }
    return actors.size
  }, [logs])

  return (
    <Card>
      <CardContent className="p-4 sm:p-6 space-y-5">
        <div className="audit-stats">
          <div className="audit-stats__card">
            <div className="audit-stats__value">{logs.length}</div>
            <div className="audit-stats__label">Total events</div>
          </div>
          <div className="audit-stats__card">
            <div className="audit-stats__value">{uniqueActors}</div>
            <div className="audit-stats__label">Admins involved</div>
          </div>
          <div className="audit-stats__card">
            <div className="audit-stats__value">{categoryCounts.profile}</div>
            <div className="audit-stats__label">Profile changes</div>
          </div>
          <div className="audit-stats__card">
            <div className="audit-stats__value">{categoryCounts.registration}</div>
            <div className="audit-stats__label">Check-in & exports</div>
          </div>
          <div className="audit-stats__card">
            <div className="audit-stats__value">{categoryCounts.directory + categoryCounts.settings}</div>
            <div className="audit-stats__label">Site settings</div>
          </div>
        </div>

        <div className="audit-filters">
          <div className="audit-filters__search">
            <Input
              ref={searchRef}
              className="audit-filters__input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actions, admins, details…"
            />
            {search ? (
              <button
                type="button"
                className="audit-filters__clear"
                onClick={() => {
                  setSearch("")
                  searchRef.current?.focus()
                }}
                aria-label="Clear search"
              >
                ×
              </button>
            ) : null}
          </div>

          <select
            className="audit-filters__select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by action type"
          >
            {AUDIT_CATEGORY_FILTERS.map((filter) => (
              <option key={filter.value || "all"} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>

          <div className="audit-filters__date-pills">
            {(["7d", "30d", "90d", "all"] as const).map((range) => (
              <button
                key={range}
                type="button"
                className={cn(
                  "audit-filters__pill",
                  dateRange === range && "audit-filters__pill--active",
                )}
                onClick={() => setDateRange(range)}
              >
                {range === "all"
                  ? "All time"
                  : range === "7d"
                    ? "7 days"
                    : range === "30d"
                      ? "30 days"
                      : "90 days"}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {error && !loading ? (
          <div className="callout-destructive rounded-lg border p-4">
            <p className="text-sm">{error}</p>
            <AdminRetryButton onRetry={() => void load()} label="Reload audit logs" />
          </div>
        ) : loading ? (
          <AdminListSkeleton rows={5} label="Loading audit logs" />
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p className="font-medium text-foreground">No activity</p>
            <p className="mt-1 text-sm">
              {search
                ? "No events match your search."
                : "Exports, check-ins, profile approvals, and settings changes will appear here."}
            </p>
          </div>
        ) : (
          <div className="audit-feed">
            {grouped.map((group) => (
              <div key={group.label} className="audit-feed__group">
                <div className="audit-feed__date-label">{group.label}</div>
                <div className="audit-feed__list">
                  {group.logs.map((log) => {
                    const info = resolveAuditAction(log.action)
                    const ActionIcon = resolveAuditActionIcon(log.action)
                    const ts = formatAuditListTimestamp(log.createdAt)
                    const isExpanded = expandedId === log.id
                    const detailMeta = publicAuditMetadata(log.metadata)

                    return (
                      <div
                        key={log.id}
                        className={cn(
                          "audit-entry",
                          `audit-entry--${info.color}`,
                          isExpanded && "audit-entry--expanded",
                        )}
                      >
                        <button
                          type="button"
                          className="audit-entry__header"
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          aria-expanded={isExpanded}
                        >
                          <span className="audit-entry__icon">
                            <ActionIcon className="h-5 w-5" aria-hidden />
                          </span>
                          <div className="audit-entry__main">
                            <span className="audit-entry__label">{info.label}</span>
                            <span className="audit-entry__actor">{resolveAuditActorName(log)}</span>
                          </div>
                          <div className="audit-entry__time">
                            {ts.relative ? (
                              <span className="audit-entry__relative">{ts.relative}</span>
                            ) : null}
                            <span className="audit-entry__absolute">{ts.absolute}</span>
                          </div>
                          <span className="audit-entry__chevron" aria-hidden>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </span>
                        </button>

                        {isExpanded ? (
                          <div className="audit-entry__detail">
                            <div className="audit-detail__row">
                              <span className="audit-detail__label">Action</span>
                              <code className="audit-detail__code">{log.action}</code>
                            </div>
                            {log.resourceType ? (
                              <div className="audit-detail__row">
                                <span className="audit-detail__label">Resource</span>
                                <span>
                                  {log.resourceType}
                                  {log.resourceId ? ` #${log.resourceId}` : ""}
                                </span>
                              </div>
                            ) : null}
                            <div className="audit-detail__row">
                              <span className="audit-detail__label">Performed by</span>
                              <span>{resolveAuditActorName(log)}</span>
                            </div>
                            {log.ipAddress ? (
                              <div className="audit-detail__row">
                                <span className="audit-detail__label">IP address</span>
                                <span className="font-mono text-xs">{log.ipAddress}</span>
                              </div>
                            ) : null}
                            <div className="audit-detail__row">
                              <span className="audit-detail__label">Timestamp</span>
                              <span>{formatAuditDetailTimestamp(log.createdAt)}</span>
                            </div>
                            {detailMeta ? (
                              <div className="audit-detail__section">
                                <span className="audit-detail__section-title">Details</span>
                                <MetadataChanges meta={detailMeta} />
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
