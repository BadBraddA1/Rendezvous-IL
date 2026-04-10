"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GitMerge, GitPullRequest, GitPullRequestClosed, ExternalLink, CalendarDays, User } from "lucide-react"
import { formatDistanceToNow, parseISO } from "date-fns"

export interface PullRequest {
  number: number
  title: string
  body: string | null
  state: string
  merged_at: string | null
  created_at: string
  updated_at: string
  html_url: string
  user: {
    login: string
    avatar_url: string
    html_url: string
  }
  labels: { name: string; color: string }[]
}

type Filter = "all" | "merged" | "open" | "closed"

const MAX_SUMMARY_LENGTH = 200

function prStatus(pr: PullRequest): "merged" | "open" | "closed" {
  if (pr.merged_at) return "merged"
  if (pr.state === "open") return "open"
  return "closed"
}

function StatusBadge({ status }: { status: "merged" | "open" | "closed" }) {
  if (status === "merged") {
    return (
      <Badge className="gap-1 bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200">
        <GitMerge className="h-3 w-3" />
        Merged
      </Badge>
    )
  }
  if (status === "open") {
    return (
      <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
        <GitPullRequest className="h-3 w-3" />
        Open
      </Badge>
    )
  }
  return (
    <Badge className="gap-1 bg-muted text-muted-foreground hover:bg-muted border-border">
      <GitPullRequestClosed className="h-3 w-3" />
      Closed
    </Badge>
  )
}

function PRCard({ pr }: { pr: PullRequest }) {
  const status = prStatus(pr)
  const date = pr.merged_at ?? pr.updated_at
  const summary = pr.body?.trim().split("\n")[0]?.slice(0, MAX_SUMMARY_LENGTH) ?? null

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur transition-all hover:border-primary/40 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {pr.labels.map((label) => (
              <Badge
                key={label.name}
                variant="outline"
                className="text-xs"
                style={{ borderColor: `#${label.color}`, color: `#${label.color}` }}
              >
                {label.name}
              </Badge>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">#{pr.number}</span>
        </div>
        <CardTitle className="text-base leading-snug">{pr.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary && <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">{summary}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              <a
                href={pr.user.html_url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium hover:text-primary transition-colors"
              >
                {pr.user.login}
              </a>
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDistanceToNow(parseISO(date), { addSuffix: true })}
            </span>
          </div>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" asChild>
            <a href={pr.html_url} target="_blank" rel="noreferrer noopener">
              View on GitHub
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const FILTER_LABELS: { value: Filter; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All", icon: <GitPullRequest className="h-4 w-4" /> },
  { value: "open", label: "Open", icon: <GitPullRequest className="h-4 w-4" /> },
  { value: "merged", label: "Merged", icon: <GitMerge className="h-4 w-4" /> },
  { value: "closed", label: "Closed", icon: <GitPullRequestClosed className="h-4 w-4" /> },
]

export function DevlogClient({ pullRequests }: { pullRequests: PullRequest[] }) {
  const [filter, setFilter] = useState<Filter>("all")

  const counts = {
    all: pullRequests.length,
    open: pullRequests.filter((pr) => prStatus(pr) === "open").length,
    merged: pullRequests.filter((pr) => prStatus(pr) === "merged").length,
    closed: pullRequests.filter((pr) => prStatus(pr) === "closed" && !pr.merged_at).length,
  }

  const filtered =
    filter === "all" ? pullRequests : pullRequests.filter((pr) => prStatus(pr) === filter)

  return (
    <div className="space-y-8">
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_LABELS.map(({ value, label, icon }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
              filter === value
                ? "border-primary bg-primary text-primary-foreground shadow"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {icon}
            {label}
            <span
              className={`ml-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                filter === value ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {counts[value]}
            </span>
          </button>
        ))}
      </div>

      {/* PR list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          No pull requests found for this filter.
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((pr) => (
            <PRCard key={pr.number} pr={pr} />
          ))}
        </div>
      )}
    </div>
  )
}
