"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, RotateCcw, KeyRound, CheckCircle2 } from "lucide-react"

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

export function CheckedInTable() {
  const [rows, setRows] = useState<CheckedInRow[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/registrations/checked-in")
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("[v0] Failed to fetch checked-in:", error)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
    const interval = setInterval(() => void fetchData(), 30_000) // auto-refresh every 30s
    return () => clearInterval(interval)
  }, [fetchData])

  const undoCheckIn = async (id: number, name: string) => {
    if (!confirm(`Undo check-in for ${name} family?`)) return
    try {
      const res = await fetch(`/api/admin/registrations/${id}/checkin`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Check-in undone" })
      void fetchData()
    } catch {
      toast({ title: "Error", description: "Could not undo", variant: "destructive" })
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
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Families Checked In</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">People On-Site</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalAttendees}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Motel Families</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{motelFamilies}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Keys Out</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{keysOut}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Currently Checked In</CardTitle>
          <Button onClick={() => void fetchData()} variant="outline" size="sm" className="gap-2 bg-transparent">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Family</TableHead>
                  <TableHead>Lodging</TableHead>
                  <TableHead>Checked In</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Keys</TableHead>
                  <TableHead>T-Shirts</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Loading...</TableCell>
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
                      <TableCell>
                        <div>
                          <p className="font-medium">{r.family_last_name}</p>
                          <p className="text-xs text-muted-foreground">{r.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{r.lodging_type || "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>{r.attendee_count}</TableCell>
                      <TableCell>
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
                      <TableCell>
                        {r.tshirts_distributed ? (
                          <Badge variant="default" className="gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" />Given
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(r.room_keys?.length || 0) > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleKeysReturned(r)}
                              title={r.keys_returned ? "Mark keys not returned" : "Mark keys returned"}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => undoCheckIn(r.id, r.family_last_name)}
                            className="text-destructive"
                            title="Undo check-in"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
