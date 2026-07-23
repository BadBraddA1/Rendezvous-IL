"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Monitor, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { LIVE_UPDATES_ROOM_SUGGESTIONS } from "@/lib/live-updates/rooms"

type DisplayStatus = "online" | "stale" | "offline"

interface DisplayRow {
  deviceId: string
  hostname: string | null
  ip: string | null
  lastView: string | null
  kioskUrl: string | null
  buildVersion: string | null
  userAgent: string | null
  roomLabel: string | null
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
  const [roomDrafts, setRoomDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchDisplays = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)

    try {
      const response = await fetch("/api/admin/displays")
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to load displays")
      const next = (data.displays || []) as DisplayRow[]
      setDisplays(next)
      setRoomDrafts((prev) => {
        const merged: Record<string, string> = {}
        for (const display of next) {
          merged[display.deviceId] =
            prev[display.deviceId] !== undefined
              ? prev[display.deviceId]
              : display.roomLabel ?? ""
        }
        return merged
      })
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

  const saveRoom = async (deviceId: string) => {
    setSavingId(deviceId)
    try {
      const roomLabel = (roomDrafts[deviceId] ?? "").trim()
      const response = await fetch("/api/admin/displays", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, roomLabel: roomLabel || null }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to save room")
      toast.success(roomLabel ? `Room set to ${roomLabel}` : "Room cleared")
      void fetchDisplays(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save room")
    } finally {
      setSavingId(null)
    }
  }

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
            Assign each Pi/TV to a room so the screen shows where people are. Online = seen within
            5 minutes.
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
            Set a room name per device — it appears on the TV so families know they&apos;re in the
            right place. You can also put <code className="text-xs">?room=Activities+Center</code>{" "}
            in the kiosk URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Hostname</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Current view</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displays.map((display) => {
                const draft = roomDrafts[display.deviceId] ?? ""
                const dirty = draft.trim() !== (display.roomLabel ?? "").trim()
                return (
                  <TableRow key={display.deviceId}>
                    <TableCell className="font-mono text-sm">{display.deviceId}</TableCell>
                    <TableCell className="min-w-[14rem]">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          list="lu-room-suggestions"
                          value={draft}
                          onChange={(e) =>
                            setRoomDrafts((prev) => ({
                              ...prev,
                              [display.deviceId]: e.target.value,
                            }))
                          }
                          placeholder="e.g. Activities Center"
                          maxLength={80}
                          className="h-9 min-w-[10rem]"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant={dirty ? "default" : "outline"}
                          disabled={savingId === display.deviceId || !dirty}
                          onClick={() => void saveRoom(display.deviceId)}
                        >
                          {savingId === display.deviceId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                      </div>
                    </TableCell>
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
                )
              })}
            </TableBody>
          </Table>

          <datalist id="lu-room-suggestions">
            {LIVE_UPDATES_ROOM_SUGGESTIONS.map((room) => (
              <option key={room} value={room} />
            ))}
          </datalist>

          {displays.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No displays have checked in yet. Open a kiosk URL with{" "}
              <code className="text-xs">?kiosk=1&amp;device=pi-ac</code> first.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
