"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDistanceToNow } from "date-fns"
import { RefreshCw } from "lucide-react"
import { AdminListSkeleton, AdminRetryButton } from "./admin-panel-states"

type AuditLogRow = {
  id: number
  admin_email: string
  action: string
  resource_type?: string | null
  resource_id?: string | null
  ip_address?: string | null
  created_at: string
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/audit")
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to load audit logs")
      }
      setLogs(Array.isArray(data.logs) ? data.logs : [])
    } catch (err) {
      setLogs([])
      setError(err instanceof Error ? err.message : "Failed to load audit logs")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  const getActionColor = (action: string) => {
    if (action.includes("delete") || action.includes("reject")) return "destructive"
    if (action.includes("create") || action.includes("approve")) return "default"
    if (action.includes("update") || action.includes("change")) return "secondary"
    return "outline"
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => void fetchLogs()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && !loading ? (
          <div className="callout-destructive rounded-lg border p-4">
            <p className="text-sm">{error}</p>
            <AdminRetryButton onRetry={() => void fetchLogs()} label="Reload audit logs" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <AdminListSkeleton rows={4} label="Loading audit logs" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No audit logs yet — actions like exports, check-ins, and role changes will appear here.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {log.created_at
                          ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true })
                          : "—"}
                      </TableCell>
                      <TableCell className="font-medium">{log.admin_email}</TableCell>
                      <TableCell>
                        <Badge variant={getActionColor(log.action)}>{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.resource_type || "—"}
                        {log.resource_id ? ` #${log.resource_id}` : ""}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.ip_address || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
