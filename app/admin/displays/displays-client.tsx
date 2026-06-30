"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Monitor, RefreshCw } from "lucide-react"
import { toast } from "sonner"

type DisplayStatus = "online" | "stale" | "offline"

interface DisplayRow {
  deviceId: string
  hostname: string | null
  ip: string | null
  lastView: string | null
  kioskUrl: string | null
  buildVersion: string | null
  userAgent: string | null
  firstSeenAt: string
  lastSeenAt: string
  updatedAt: string
  stale: boolean
  status: DisplayStatus
}

const REFRESH_MS = 30_000

function formatRelativeTime(value: string | null) {
  if (!value) return "Never"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown"

  const diffSec = Math.round((date.getTime() - Date.now()) / 1000)
  const absSec = Math.abs(diffSec)

  const units: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
    { unit: "year", seconds: 60 * 60 * 24 * 365 },
    { unit: "month", seconds: 60 * 60 * 24 * 30 },
    { unit: "week", seconds: 60 * 60 * 24 * 7 },
    { unit: "day", seconds: 60 * 60 * 24 },
    { unit: "hour", seconds: 60 * 60 },
    { unit: "minute", seconds: 60 },
    { unit: "second", seconds: 1 },
  ]

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })

  for (const { unit, seconds } of units) {
    if (absSec >= seconds || unit === "second") {
      const value = Math.round(diffSec / seconds)
      return formatter.format(value, unit)
    }
  }

  return "Unknown"
}

function statusBadge(status: DisplayStatus) {
  switch (status) {
    case "online":
      return <Badge className="bg-emerald-600 hover:bg-emerald-600">Online</Badge>
    case "stale":
      return <Badge variant="secondary">Stale</Badge>
    case "offline":
      return <Badge variant="destructive">Offline</Badge>
  }
}

export function DisplaysClient() {
  const [displays, setDisplays] = useState<DisplayRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDisplays = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)

    try {
      const response = await fetch("/api/admin/displays")
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to load displays")
      setDisplays(data.displays || [])
    } catch (error) {
      console.error("Error fetching displays:", error)
      toast.error("Failed to load displays")
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDisplays()
  }, [fetchDisplays])

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchDisplays(false)
    }, REFRESH_MS)

    return () => window.clearInterval(interval)
  }, [fetchDisplays])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-section-title text-balance tracking-tight flex items-center gap-3">
            <Monitor className="h-8 w-8" />
            Live Update Displays
          </h1>
          <p className="text-lead text-muted-foreground mt-1">
            Raspberry Pi kiosks ping every minute. Online = seen within 5 minutes.
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchDisplays()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Fleet ({displays.length})
          </CardTitle>
          <CardDescription>
            Auto-refreshes every 30 seconds. Displays post heartbeats to{" "}
            <code className="text-xs">POST /api/live-updates/heartbeat</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Hostname</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Current view</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displays.map((display) => (
                <TableRow key={display.deviceId}>
                  <TableCell className="font-mono text-sm">{display.deviceId}</TableCell>
                  <TableCell>{display.hostname || "—"}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {display.ip || "—"}
                  </TableCell>
                  <TableCell>{display.lastView || "—"}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(display.lastSeenAt)}
                  </TableCell>
                  <TableCell>{statusBadge(display.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {displays.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No displays have checked in yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
