"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react"
import {
  DEFAULT_REGISTRATION_EVENT_YEAR,
  REGISTRATION_EVENT_YEARS,
  REGISTRATION_YEAR_STORAGE_KEY,
  parseRegistrationEventYear,
  registrationYearLabel,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"
import type { HomeBoardBannerSection, HomeBoardSection } from "@/lib/home-board"

type Props = {
  canManage: boolean
}

const BUILTIN_LABELS: Record<string, string> = {
  header: "Header greeting",
  check_in: "Family check-in status",
  now_next: "Now & next",
  weather: "Weather",
  announcements: "Announcements",
  next_meal: "Next meal",
  chat: "Chat unread",
  volunteering: "Your volunteering",
}

function readStoredEventYear(): RegistrationEventYear {
  if (typeof window === "undefined") return DEFAULT_REGISTRATION_EVENT_YEAR
  return parseRegistrationEventYear(window.sessionStorage.getItem(REGISTRATION_YEAR_STORAGE_KEY))
}

function newBanner(): HomeBoardBannerSection {
  return {
    id: `banner-${Date.now()}`,
    type: "banner",
    enabled: true,
    title: "",
    body: "",
    linkUrl: "",
    linkLabel: "",
  }
}

export function HomeBoardManager({ canManage }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [eventYear, setEventYear] = useState<RegistrationEventYear>(DEFAULT_REGISTRATION_EVENT_YEAR)
  const [sections, setSections] = useState<HomeBoardSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    const yearFromUrl = searchParams.get("year")
    if (yearFromUrl) {
      setEventYear(parseRegistrationEventYear(yearFromUrl))
      return
    }
    setEventYear(readStoredEventYear())
  }, [searchParams])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem(REGISTRATION_YEAR_STORAGE_KEY, String(eventYear))
  }, [eventYear])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/home-board?year=${eventYear}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setSections(data.board?.sections ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [eventYear])

  useEffect(() => {
    void load()
  }, [load])

  const handleYearChange = (value: string) => {
    const year = parseRegistrationEventYear(value)
    setEventYear(year)
    const params = new URLSearchParams(searchParams.toString())
    params.set("year", String(year))
    router.replace(`${pathname}?${params.toString()}`)
  }

  function move(index: number, delta: number) {
    setSections((current) => {
      const next = [...current]
      const target = index + delta
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function updateSection(index: number, patch: Partial<HomeBoardSection>) {
    setSections((current) =>
      current.map((section, i) => {
        if (i !== index) return section
        return { ...section, ...patch } as HomeBoardSection
      }),
    )
  }

  function removeBanner(index: number) {
    setSections((current) => current.filter((section, i) => !(i === index && section.type === "banner")))
  }

  async function save() {
    if (!canManage) return
    setSaving(true)
    setError(null)
    setSavedAt(null)
    try {
      const res = await fetch("/api/admin/home-board", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: eventYear, sections }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to save")
      setSections(data.board?.sections ?? sections)
      setSavedAt(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="max-w-xs">
        <Label htmlFor="home-board-year">Event year</Label>
        <Select value={String(eventYear)} onValueChange={handleYearChange}>
          <SelectTrigger id="home-board-year" className="min-h-11">
            <SelectValue placeholder="Event year" />
          </SelectTrigger>
          <SelectContent>
            {REGISTRATION_EVENT_YEARS.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {registrationYearLabel(year)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>App Home board</CardTitle>
          <CardDescription>
            Reorder and show/hide Today sections on iOS and Android. Banner cards push live copy
            without an App Store update. Empty sections (no weather, no announcements, etc.) still
            hide themselves on the device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <ul className="space-y-3">
              {sections.map((section, index) => (
                <li
                  key={section.id}
                  className="rounded-lg border bg-card p-3 space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Switch
                        checked={section.enabled}
                        disabled={!canManage}
                        onCheckedChange={(enabled) => updateSection(index, { enabled })}
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {section.type === "banner"
                            ? section.title.trim() || "Banner"
                            : BUILTIN_LABELS[section.type] || section.type}
                        </p>
                        <p className="text-xs text-muted-foreground">{section.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={!canManage || index === 0}
                        onClick={() => move(index, -1)}
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={!canManage || index === sections.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      {section.type === "banner" ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={!canManage}
                          onClick={() => removeBanner(index)}
                          aria-label="Remove banner"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {section.type === "banner" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label>Title</Label>
                        <Input
                          value={section.title}
                          disabled={!canManage}
                          onChange={(e) => updateSection(index, { title: e.target.value })}
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label>Body</Label>
                        <Textarea
                          value={section.body}
                          disabled={!canManage}
                          rows={3}
                          onChange={(e) => updateSection(index, { body: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Link URL (optional)</Label>
                        <Input
                          value={section.linkUrl || ""}
                          disabled={!canManage}
                          placeholder="https://"
                          onChange={(e) => updateSection(index, { linkUrl: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Link label (optional)</Label>
                        <Input
                          value={section.linkLabel || ""}
                          disabled={!canManage}
                          placeholder="Learn more"
                          onChange={(e) => updateSection(index, { linkLabel: e.target.value })}
                        />
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {savedAt ? (
            <p className="text-sm text-muted-foreground">Saved at {savedAt}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!canManage || loading}
              onClick={() => setSections((current) => [...current, newBanner()])}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add banner
            </Button>
            <Button type="button" disabled={!canManage || loading || saving} onClick={() => void save()}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save home board
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
