"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AdminPanelSkeleton,
  AdminRetryButton,
} from "@/components/admin/admin-panel-states"
import { AdminStatStrip, AdminStatItem } from "@/components/admin/admin-stat-strip"

interface Stats {
  totalRegistrations: number
  totalAttendees: number
  totalRevenue: number
  lodgingBreakdown: {
    motel: number
    rv: number
    tent: number
  }
}

const STAT_PLACEHOLDERS = [
  "Total families",
  "Total attendees",
  "Total revenue",
  "Lodging",
] as const

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(() => {
    setLoading(true)
    setError(null)

    fetch("/api/admin/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch stats")
        return res.json()
      })
      .then((data) => {
        setStats(data)
      })
      .catch((err) => {
        console.error("[v0] Error fetching stats:", err)
        setError("Unable to load statistics. Check your connection and try again.")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  if (loading) {
    return (
      <AdminStatStrip>
        {STAT_PLACEHOLDERS.map((title) => (
          <div key={title} className="admin-stat-item">
            <span className="admin-stat-label">{title}</span>
            <AdminPanelSkeleton label={`Loading ${title.toLowerCase()}`} />
          </div>
        ))}
      </AdminStatStrip>
    )
  }

  if (error) {
    return (
      <Card className="callout-destructive">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-destructive">Statistics unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{error}</p>
          <AdminRetryButton onRetry={loadStats} />
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  return (
    <AdminStatStrip>
      <AdminStatItem
        label="Total families"
        value={stats.totalRegistrations}
        hint="Registered families"
      />
      <AdminStatItem
        label="Total attendees"
        value={stats.totalAttendees}
        hint="Individual attendees"
      />
      <AdminStatItem
        label="Total revenue"
        value={`$${stats.totalRevenue.toFixed(2)}`}
        hint="Registration + extras"
      />
      <AdminStatItem
        label="Lodging"
        value={`${stats.lodgingBreakdown.motel} motel · ${stats.lodgingBreakdown.rv} RV · ${stats.lodgingBreakdown.tent} tent`}
        valueClassName="text-base font-medium"
      />
    </AdminStatStrip>
  )
}
