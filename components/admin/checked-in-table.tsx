"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, RotateCcw, KeyRound, CheckCircle2 } from "lucide-react"
import { AdminConfirmDialog } from "./admin-confirm-dialog"
import { AdminListSkeleton, AdminRetryButton } from "./admin-panel-states"
import { AdminStatStrip, AdminStatItem } from "@/components/admin/admin-stat-strip"
import { normalizeStringArray } from "@/lib/normalize-string-array"

type CheckedInRow = {
  id: number
  family_last_name: string
  email: string
  husband_phone?: string
  lodging_type?: string
  checkin_qr_code?: string
  checked_in_at: string
  room_keys?: string[]
  keys_taken_count?: number
  keys_returned?: boolean
  keys_returned_at?: string | null
  tshirts_distributed?: boolean
  attendee_count?: number
}

function normalizeCheckedInRow(row: CheckedInRow): CheckedInRow {
  return {
    ...row,
    room_keys: normalizeStringArray(row.room_keys),
    attendee_count: Number(row.attendee_count ?? 0),
    keys_returned: Boolean(row.keys_returned),
    tshirts_distributed: Boolean(row.tshirts_distributed),
  }
}

export function CheckedInTable() {
  const [rows, setRows] = useState<CheckedInRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [undoPending, setUndoPending] = useState<CheckedInRow | null>(null)
  const [undoLoading, setUndoLoading] = useState(false)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch("/api/admin/registrations/checked-in")
      if (!res.ok) throw new Error(`Could not load checked-in families (${res.status})`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      setRows(list.map((row) => normalizeCheckedInRow(row as CheckedInRow)))
    } catch (error) {
      console.error("[v0] Failed to fetch checked-in:", error)
      setRows([])
      setFetchError(error instanceof Error ? error.message : "Could not load checked-in families")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
    const interval = setInterval(() => void fetchData(), 30_000) // auto-refresh every 30s
    return () => clearInterval(interval)
  }, [fetchData])

  const performUndoCheckIn = async () => {
    if (!undoPending) return
    setUndoLoading(true)
    try {
      const res = await fetch(`/api/admin/registrations/${undoPending.id}/checkin`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Check-in undone", description: `${undoPending.family_last_name} family can check in again.` })
      setUndoPending(null)
      void fetchData()
    } catch {
      toast({ title: "Error", description: "Could not undo check-in.", variant: "destructive" })
    } finally {
      setUndoLoading(false)
    }
  }

  const toggleKeysReturned = async (row: CheckedInRow) => {
    try {
      const res = await fetch(`/api/admin/registrations/${row.id}/checkin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys_returned: !row.keys_returned }),
      })
      if (!res.ok) throw new Error("Failed")
      void fetchData()
    } catch {
      toast({ title: "Error", description: "Could not update", variant: "destructive" })
    }
  }

  const total = rows.length
  const totalAttendees = rows.reduce((sum, r) => sum + (r.attendee_count || 0), 0)
  const motelFamilies = rows.filter((r) => r.lodging_type?.startsWith("motel")).length
  const keysOut = rows.filter((r) => (r.room_keys?.length || 0) > 0 && !r.keys_returned).length

  return (
    <div className="space-y-6">
      <AdminStatStrip>
        <AdminStatItem label="Families checked in" value={total} />
        <AdminStatItem label="People on-site" value={totalAttendees} />
        <AdminStatItem label="Motel families" value={motelFamilies} />
        <AdminStatItem label="Keys out" value={keysOut} />
      </AdminStatStrip>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Currently Checked In</CardTitle>
          <Button
            onClick={() => void fetchData()}
            variant="outline"
            className="admin-toolbar-action gap-2 self-start bg-transparent sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {fetchError && !loading ? (
            <div className="callout-destructive rounded-lg border p-4">
              <p className="text-sm">{fetchError}</p>
              <AdminRetryButton onRetry={() => void fetchData()} label="Reload checked-in list" />
            </div>
          ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Family</TableHead>
                  <TableHead>Lodging</TableHead>
                  <TableHead className="hidden md:table-cell">Checked In</TableHead>
                  <TableHead className="hidden lg:table-cell">Members</TableHead>
                  <TableHead className="hidden lg:table-cell">Keys</TableHead>
                  <TableHead className="hidden md:table-cell">T-Shirts</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <AdminListSkeleton rows={4} label="Loading checked-in families" />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No families checked in yet
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="min-w-0">
                        <div>
                          <p className="font-medium break-words">{r.family_last_name}</p>
                          <p className="text-xs text-muted-foreground break-all">{r.email}</p>
                          <p className="mt-1 text-xs text-muted-foreground md:hidden">
                            {r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{r.lodging_type || "—"}</Badge>
                      </TableCell>
                      <TableCell className="hidden text-sm md:table-cell">
                        {r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{r.attendee_count}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {r.room_keys && r.room_keys.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <KeyRound className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{r.room_keys.join(", ")}</span>
                            {r.keys_returned && (
                              <Badge variant="outline" className="ml-1 text-xs">Returned</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {r.tshirts_distributed ? (
                          <Badge variant="default" className="gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />Given
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(r.room_keys?.length || 0) > 0 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="touch-target shrink-0"
                              onClick={() => toggleKeysReturned(r)}
                              aria-label={r.keys_returned ? `Mark keys not returned for ${r.family_last_name} family` : `Mark keys returned for ${r.family_last_name} family`}
                            >
                              <KeyRound className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="touch-target shrink-0 text-destructive hover:text-destructive"
                            onClick={() => setUndoPending(r)}
                            aria-label={`Undo check-in for ${r.family_last_name} family`}
                          >
                            <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
      </Card>

      <AdminConfirmDialog
        open={undoPending !== null}
        onOpenChange={(open) => {
          if (!open && !undoLoading) setUndoPending(null)
        }}
        title="Undo check-in?"
        description={
          undoPending
            ? `Undo check-in for the ${undoPending.family_last_name} family? They will need to check in again at the station.`
            : ""
        }
        confirmLabel="Undo check-in"
        loading={undoLoading}
        onConfirm={performUndoCheckIn}
      />
    </div>
  )
}
