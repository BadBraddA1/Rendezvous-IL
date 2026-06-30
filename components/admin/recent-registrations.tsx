"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import {
  AdminListSkeleton,
  AdminRetryButton,
} from "@/components/admin/admin-panel-states"

type RecentRegistration = {
  id: number
  family_last_name: string
  email: string
  lodging_type: string
  created_at: string
}

export function RecentRegistrations() {
  const [registrations, setRegistrations] = useState<RecentRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRegistrations = useCallback(() => {
    setLoading(true)
    setError(null)

    fetch("/api/admin/registrations/recent")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch recent registrations")
        return res.json()
      })
      .then((data) => {
        setRegistrations(data)
      })
      .catch((err) => {
        console.error("[v0] Error fetching recent registrations:", err)
        setError("Unable to load recent registrations. Check your connection and try again.")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    loadRegistrations()
  }, [loadRegistrations])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent registrations</CardTitle>
          <CardDescription>Latest family registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminListSkeleton label="Loading recent registrations" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="callout-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Recent registrations</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminRetryButton onRetry={loadRegistrations} />
        </CardContent>
      </Card>
    )
  }

  if (registrations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent registrations</CardTitle>
          <CardDescription>Latest family registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No registrations yet. New families will appear here as they sign up.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent registrations</CardTitle>
        <CardDescription>Latest family registrations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {registrations.map((reg) => (
            <div
              key={reg.id}
              className="flex items-start justify-between gap-4 border-b pb-4 last:border-0"
            >
              <div className="min-w-0">
                <p className="break-words font-medium">{reg.family_last_name} family</p>
                <p className="break-all text-sm text-muted-foreground">{reg.email}</p>
              </div>
              <div className="shrink-0 text-right">
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
