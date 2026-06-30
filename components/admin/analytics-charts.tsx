"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { CHART_COLORS } from "@/lib/email-templates"
import {
  AdminChartSkeleton,
  AdminRetryButton,
} from "@/components/admin/admin-panel-states"

type AnalyticsData = {
  registrationsByDate: Array<{ date: string; count: number }>
  lodgingDistribution: Array<{ name: string; value: number }>
}

export function AnalyticsCharts() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(() => {
    setLoading(true)
    setError(null)

    fetch("/api/admin/analytics")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch analytics")
        return res.json()
      })
      .then((nextData) => {
        setData(nextData)
      })
      .catch((err) => {
        console.error("[v0] Error fetching analytics:", err)
        setError("Unable to load analytics. Check your connection and try again.")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Registrations over time</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminChartSkeleton label="Loading registrations chart" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lodging distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminChartSkeleton label="Loading lodging chart" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="callout-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Analytics unavailable</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminRetryButton onRetry={loadAnalytics} />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const COLORS = [...CHART_COLORS]

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Registrations over time</CardTitle>
          <CardDescription>Daily registration counts</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.registrationsByDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill={CHART_COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lodging distribution</CardTitle>
          <CardDescription>Breakdown by lodging type</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.lodgingDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill={CHART_COLORS[0]}
                dataKey="value"
              >
                {data.lodgingDistribution.map((entry, index) => (
                  <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
