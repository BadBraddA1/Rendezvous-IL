"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

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

  useEffect(() => {
    fetch("/api/admin/stats/payments")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch payment stats")
        return res.json()
      })
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("[v0] Error fetching payment stats:", err)
        setError("Unable to load payment data")
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-red-900">Payment Status Unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-700">{error}</p>
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
          <DollarSign className="h-4 w-4" />
          Payment Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold">${stats.totalReceived.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground">of ${stats.totalExpected.toFixed(2)}</span>
          </div>
          <Progress value={paymentPercentage} className="h-2" />
          <p className="mt-1 text-xs text-muted-foreground">{paymentPercentage.toFixed(1)}% collected</p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-muted-foreground">Full Payment</span>
            </div>
            <span className="font-medium">{stats.fullPaymentsPaid} families</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-orange-500" />
              <span className="text-muted-foreground">Reg Fee Only</span>
            </div>
            <span className="font-medium">{stats.registrationFeesPaid} families</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3 w-3 text-red-500" />
              <span className="text-muted-foreground">Unpaid</span>
            </div>
            <span className="font-medium">{stats.unpaidCount} families</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
