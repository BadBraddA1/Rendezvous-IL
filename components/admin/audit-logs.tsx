"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDistanceToNow } from "date-fns"

export function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/admin/audit")
      .then((res) => res.json())
      .then(setLogs)
  }, [])

  const getActionColor = (action: string) => {
    if (action.includes("delete")) return "destructive"
    if (action.includes("create")) return "default"
    if (action.includes("update")) return "secondary"
    return "outline"
  }

  return (
    <Card>
      <CardContent className="p-6">
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
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No audit logs yet
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="font-medium">{log.admin_email}</TableCell>
                    <TableCell>
                      <Badge variant={getActionColor(log.action)}>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.resource_type} {log.resource_id && `#${log.resource_id}`}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.ip_address}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
