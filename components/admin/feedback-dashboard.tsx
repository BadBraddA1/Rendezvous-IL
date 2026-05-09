"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, MessageSquare, Star, ThumbsUp } from "lucide-react"

type Feedback = {
  id: number
  family_name: string
  family_size?: string
  years_attended?: string
  event_year?: number
  overall_experience?: string
  likely_to_recommend?: string
  will_return?: string
  best_memory?: string
  improvement_suggestions?: string
  additional_comments?: string
  food_quality?: string
  food_variety?: string
  meal_feedback?: string
  worship_feedback?: string
  fellowship_feedback?: string
  activity_feedback?: string
  community_atmosphere?: string
  schedule_rating?: string
  lodging_satisfaction?: string
  lodging_type?: string
  created_at: string
}

const ratingValue = (s?: string): number => {
  if (!s) return 0
  const lower = s.toLowerCase()
  if (lower.includes("excellent") || lower === "5") return 5
  if (lower.includes("very good") || lower === "4") return 4
  if (lower.includes("good") || lower === "3") return 3
  if (lower.includes("fair") || lower === "2") return 2
  if (lower.includes("poor") || lower === "1") return 1
  const n = Number.parseInt(lower, 10)
  return Number.isFinite(n) ? n : 0
}

export function FeedbackDashboard() {
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/admin/feedback")
        const data = await res.json()
        setItems(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("[v0] Failed to fetch feedback:", error)
        setItems([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const stats = useMemo(() => {
    if (items.length === 0) return null
    const overall = items.map((f) => ratingValue(f.overall_experience)).filter(Boolean)
    const avgOverall = overall.length ? overall.reduce((a, b) => a + b, 0) / overall.length : 0
    const willReturnYes = items.filter((f) => (f.will_return || "").toLowerCase().startsWith("y")).length
    const recommendYes = items.filter((f) => (f.likely_to_recommend || "").toLowerCase().includes("y") || ratingValue(f.likely_to_recommend) >= 4).length
    return {
      total: items.length,
      avgOverall: avgOverall.toFixed(1),
      willReturn: willReturnYes,
      recommend: recommendYes,
    }
  }, [items])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No feedback submitted yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Avg Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold flex items-center gap-1">
                {stats.avgOverall}
                <Star className="h-5 w-5 text-amber-500" />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Will Return</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.willReturn}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />Would Recommend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.recommend}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        {items.map((f) => (
          <Card key={f.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {f.family_name || "Anonymous"} Family
                  {f.event_year && <span className="ml-2 text-sm font-normal text-muted-foreground">({f.event_year})</span>}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {f.overall_experience && <Badge variant="secondary">{f.overall_experience}</Badge>}
                  {f.will_return && <Badge variant="outline" className="capitalize">{f.will_return}</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                {f.family_size && <Detail label="Family Size" value={f.family_size} />}
                {f.years_attended && <Detail label="Years Attended" value={f.years_attended} />}
                {f.lodging_type && <Detail label="Lodging" value={f.lodging_type} />}
                {f.lodging_satisfaction && <Detail label="Lodging Rating" value={f.lodging_satisfaction} />}
                {f.food_quality && <Detail label="Food Quality" value={f.food_quality} />}
                {f.community_atmosphere && <Detail label="Community" value={f.community_atmosphere} />}
                {f.schedule_rating && <Detail label="Schedule" value={f.schedule_rating} />}
              </div>
              {f.best_memory && <Quote label="Best Memory" value={f.best_memory} />}
              {f.improvement_suggestions && <Quote label="Improvements" value={f.improvement_suggestions} />}
              {f.additional_comments && <Quote label="Additional Comments" value={f.additional_comments} />}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  )
}

function Quote({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 italic">{value}</p>
    </div>
  )
}
