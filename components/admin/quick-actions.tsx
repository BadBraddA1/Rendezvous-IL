"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, FileText, Mail, Download } from "lucide-react"
import Link from "next/link"

export function QuickActions() {
  const handleExportBadges = async () => {
    const res = await fetch("/api/admin/registrations/export-badges")
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `name-badges-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const handleExportAll = async () => {
    const res = await fetch("/api/admin/registrations/export")
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `registrations-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="admin-toolbar">
          <Link href="/admin/registrations" className="admin-toolbar-primary">
            <Button className="w-full gap-2" variant="outline">
              <Users className="h-4 w-4" />
              Manage Registrations
            </Button>
          </Link>

          <Button className="admin-toolbar-action gap-2" variant="outline" onClick={handleExportBadges}>
            <FileText className="h-4 w-4" />
            Download Name Badges
          </Button>

          <Button className="admin-toolbar-action gap-2" variant="outline" onClick={handleExportAll}>
            <Download className="h-4 w-4" />
            Export All Data
          </Button>

          <Link href="/admin/registrations" className="admin-toolbar-primary">
            <Button className="w-full gap-2" variant="outline">
              <Mail className="h-4 w-4" />
              Send Bulk Email
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
