"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import {
  AdminPanelSkeleton,
  AdminRetryButton,
} from "@/components/admin/admin-panel-states"

interface PaymentStats {
  totalExpected: number
  totalReceived: number
  registrationFeesPaid: number
  fullPaymentsPaid: number
  unpaidCount: number
}

export function PaymentStatusCard() {
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(() => {
    setLoading(true)
    setError(null)

    fetch("/api/admin/stats/payments")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch payment stats")
        return res.json()
      })
      .then((data) => {
        setStats(data)
      })
      .catch((err) => {
        console.error("[v0] Error fetching payment stats:", err)
        setError("Unable to load payment data. Check your connection and try again.")
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
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Payment status</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminPanelSkeleton label="Loading payment status" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="callout-destructive">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-destructive">Payment status unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{error}</p>
          <AdminRetryButton onRetry={loadStats} />
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  const paymentPercentage = stats.totalExpected > 0 ? (stats.totalReceived / stats.totalExpected) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <DollarSign className="h-4 w-4" aria-hidden="true" />
          Payment status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-amount">${stats.totalReceived.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground">of ${stats.totalExpected.toFixed(2)}</span>
          </div>
          <Progress value={paymentPercentage} className="h-2" />
          <p className="mt-1 text-xs text-muted-foreground">{paymentPercentage.toFixed(1)}% collected</p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              <span className="text-muted-foreground">Full payment</span>
            </div>
            <span className="font-medium">{stats.fullPaymentsPaid} families</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              <span className="text-muted-foreground">Reg fee only</span>
            </div>
            <span className="font-medium">{stats.registrationFeesPaid} families</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              <span className="text-muted-foreground">Unpaid</span>
            </div>
            <span className="font-medium">{stats.unpaidCount} families</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
