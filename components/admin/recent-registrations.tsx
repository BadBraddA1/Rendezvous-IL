"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"

export function RecentRegistrations() {
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/registrations/recent")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch recent registrations")
        return res.json()
      })
      .then((data) => {
        setRegistrations(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("[v0] Error fetching recent registrations:", err)
        setError("Unable to load recent registrations")
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Registrations</CardTitle>
          <CardDescription>Latest family registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-900">Recent Registrations</CardTitle>
          <CardDescription className="text-red-700">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (registrations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Registrations</CardTitle>
          <CardDescription>Latest family registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No registrations yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Registrations</CardTitle>
        <CardDescription>Latest family registrations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {registrations.map((reg) => (
            <div key={reg.id} className="flex items-center justify-between border-b pb-4 last:border-0">
              <div>
                <p className="font-medium">{reg.family_last_name} Family</p>
                <p className="text-sm text-muted-foreground">{reg.email}</p>
              </div>
              <div className="text-right">
                <Badge variant="secondary">{reg.lodging_type}</Badge>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(reg.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
