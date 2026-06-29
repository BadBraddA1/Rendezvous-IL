"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR, { mutate } from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { BookUser, Globe, GlobeLock, Loader2 } from "lucide-react"
import {
  REGISTRATION_EVENT_YEARS,
  registrationYearLabel,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type DirectoryStatusResponse = {
  years: Record<RegistrationEventYear, boolean>
}

type Props = {
  isAdmin: boolean
}

export function DirectoryYearToggles({ isAdmin }: Props) {
  const { data, isLoading } = useSWR<DirectoryStatusResponse>(
    "/api/admin/directory/status",
    fetcher,
  )
  const [togglingYear, setTogglingYear] = useState<RegistrationEventYear | null>(null)

  async function toggleYear(year: RegistrationEventYear, currentlyEnabled: boolean) {
    if (!isAdmin) return
    setTogglingYear(year)
    try {
      await fetch("/api/admin/directory/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, enabled: !currentlyEnabled }),
      })
      mutate("/api/admin/directory/status")
    } catch (error) {
      console.error("Failed to toggle directory year:", error)
    } finally {
      setTogglingYear(null)
    }
  }

  const enabledCount = REGISTRATION_EVENT_YEARS.filter(
    (year) => data?.years?.[year],
  ).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-widget-heading flex items-center gap-2">
          <BookUser className="h-4 w-4" />
          Family Directory
        </CardTitle>
        <CardDescription>
          Control which event years appear on the public family directory. Keep 2027 off until
          registration opens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading directory settings...
          </div>
        ) : (
          <>
            <div
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                enabledCount > 0 ? "callout-success" : "callout-warning"
              }`}
            >
              {enabledCount > 0 ? (
                <>
                  <Globe className="h-5 w-5 shrink-0" />
                  <span className="text-sm">
                    {enabledCount === 1
                      ? "One directory year is visible at /directory"
                      : `${enabledCount} directory years are visible at /directory`}
                  </span>
                </>
              ) : (
                <>
                  <GlobeLock className="h-5 w-5 shrink-0" />
                  <span className="text-sm">No directory years are public right now.</span>
                </>
              )}
            </div>

            <div className="space-y-3">
              {REGISTRATION_EVENT_YEARS.map((year) => {
                const enabled = data?.years?.[year] ?? (year === 2026)
                return (
                  <div
                    key={year}
                    className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{registrationYearLabel(year)}</span>
                        <Badge variant={enabled ? "default" : "secondary"}>
                          {enabled ? "Visible" : "Hidden"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {year === 2027
                          ? "Turn on when 2027 registration families should browse each other."
                          : "Archive directory for returning families."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {togglingYear === year && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => void toggleYear(year, enabled)}
                        disabled={!isAdmin || togglingYear !== null}
                        aria-label={`Toggle ${year} family directory`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {!isAdmin && (
              <p className="text-sm text-muted-foreground">
                Only admins can change directory visibility.
              </p>
            )}

            <Link
              href="/directory"
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              Preview directory
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
