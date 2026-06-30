"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Play, Route, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { MainContent } from "@/components/main-content"
import {
  canUsePageTour,
  getTourRoutes,
  PAGE_TOUR_DEFAULT_INTERVAL_SEC,
  PAGE_TOUR_HEADER_QA_INDICES,
  PAGE_TOUR_HEADER_QA_ROUTES,
  PAGE_TOUR_ROUTES,
  parseRouteIndices,
  startPageTourSession,
  type PageTourPreset,
} from "@/lib/page-tour"

const INTERVAL_OPTIONS = [1, 2, 3, 5, 8] as const
const HEADER_QA_INDEX_SET = new Set<number>(PAGE_TOUR_HEADER_QA_INDICES)

export default function PageTourLauncherPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [allowed, setAllowed] = useState(false)
  const [intervalSec, setIntervalSec] = useState<number>(PAGE_TOUR_DEFAULT_INTERVAL_SEC)
  const [includeSpecial, setIncludeSpecial] = useState(true)
  const [includeDev, setIncludeDev] = useState(true)

  useEffect(() => {
    setAllowed(canUsePageTour(window.location.hostname))
  }, [])

  useEffect(() => {
    if (!allowed) return

    const autostart = searchParams.get("autostart") === "1"
    if (!autostart) return

    const routesParam = searchParams.get("routes")
    const intervalParam = searchParams.get("interval")
    const parsedInterval = intervalParam ? Number.parseInt(intervalParam, 10) : PAGE_TOUR_DEFAULT_INTERVAL_SEC
    const sec = Number.isFinite(parsedInterval) && parsedInterval > 0 ? parsedInterval : PAGE_TOUR_DEFAULT_INTERVAL_SEC

    let preset: PageTourPreset = "header-qa"
    let customIndices: number[] | undefined

    if (routesParam) {
      const indices = parseRouteIndices(routesParam)
      if (indices?.length) {
        preset = "custom"
        customIndices = indices
      }
    } else if (searchParams.get("preset") === "full") {
      preset = "full"
    }

    const routes = startPageTourSession({
      preset,
      intervalSec: sec,
      includeSpecial,
      includeDev,
      customIndices,
    })

    const first = routes[0]
    if (first) router.replace(first.path)
  }, [allowed, searchParams, router, includeSpecial, includeDev])

  const previewRoutes = useMemo(
    () => getTourRoutes({ includeSpecial, includeDev }),
    [includeSpecial, includeDev],
  )

  function launch(preset: PageTourPreset, customIndices?: number[]) {
    const routes = startPageTourSession({
      preset,
      intervalSec,
      includeSpecial,
      includeDev,
      customIndices,
    })
    const first = routes[0]
    if (first) router.push(first.path)
  }

  if (!allowed) {
    return (
      <MainContent className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Page tour unavailable</CardTitle>
            <CardDescription>
              This tool only runs on <span className="font-mono">localhost</span> during{" "}
              <span className="font-mono">pnpm dev</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </MainContent>
    )
  }

  const headerQaLabel = PAGE_TOUR_HEADER_QA_INDICES.join(",")

  return (
    <MainContent className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-page-title flex items-center gap-2">
            <Route className="h-7 w-7 text-primary" aria-hidden="true" />
            Localhost page tour
          </h1>
          <p className="text-muted-foreground">
            Auto-advance through site routes with a countdown bar — quick visual QA for header clearance and layout.
          </p>
        </div>

        <Card className="border-primary/25 bg-surface-tint">
          <CardHeader>
            <CardTitle className="text-widget-heading">Header QA preset</CardTitle>
            <CardDescription>
              Routes {headerQaLabel} — {PAGE_TOUR_HEADER_QA_ROUTES.length} pages, {intervalSec}s each.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-1 font-mono text-sm text-muted-foreground">
              {PAGE_TOUR_HEADER_QA_ROUTES.map((route, i) => (
                <li key={route.path}>
                  {i + 1}. {route.path}{" "}
                  <span className="font-sans text-xs">({route.label})</span>
                </li>
              ))}
            </ol>
            <Button type="button" className="w-full gap-2" onClick={() => launch("header-qa")}>
              <Zap className="h-4 w-4" aria-hidden="true" />
              Start header QA tour
            </Button>
            <p className="text-xs text-muted-foreground">
              Direct link:{" "}
              <Link
                href={`/dev/page-tour?routes=${headerQaLabel}&autostart=1&interval=${intervalSec}`}
                className="font-mono text-primary hover:underline"
              >
                /dev/page-tour?routes={headerQaLabel}&amp;autostart=1
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-widget-heading">All routes</CardTitle>
            <CardDescription>Defaults to {PAGE_TOUR_DEFAULT_INTERVAL_SEC}s per page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="tour-interval">Seconds per page</Label>
              <div id="tour-interval" className="flex flex-wrap gap-2">
                {INTERVAL_OPTIONS.map((sec) => (
                  <Button
                    key={sec}
                    type="button"
                    variant={intervalSec === sec ? "default" : "outline"}
                    className="min-h-11 min-w-11"
                    onClick={() => setIntervalSec(sec)}
                    aria-pressed={intervalSec === sec}
                  >
                    {sec}s
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={includeSpecial}
                  onChange={(e) => setIncludeSpecial(e.target.checked)}
                />
                <span className="text-sm">
                  Include special layouts ({PAGE_TOUR_ROUTES.filter((r) => r.group === "special").length} pages)
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={includeDev}
                  onChange={(e) => setIncludeDev(e.target.checked)}
                />
                <span className="text-sm">
                  Include dev tools ({PAGE_TOUR_ROUTES.filter((r) => r.group === "dev").length} pages)
                </span>
              </label>
            </div>

            <Button type="button" className="w-full gap-2" variant="outline" onClick={() => launch("full")}>
              <Play className="h-4 w-4" aria-hidden="true" />
              Start full tour ({previewRoutes.length} pages)
            </Button>

            <p className="text-xs text-muted-foreground">
              Keyboard while touring: <span className="font-mono">Space</span> pause ·{" "}
              <span className="font-mono">←/→</span> prev/next · <span className="font-mono">Esc</span> stop
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-widget-heading">Full route index</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="max-h-64 space-y-1 overflow-y-auto font-mono text-sm text-muted-foreground">
              {PAGE_TOUR_ROUTES.map((route, i) => {
                const inHeaderQa = HEADER_QA_INDEX_SET.has(i + 1)
                return (
                  <li key={route.path} className={inHeaderQa ? "font-medium text-foreground" : undefined}>
                    {i + 1}. {route.path}{" "}
                    <span className="font-sans text-xs font-normal">({route.label})</span>
                  </li>
                )
              })}
            </ol>
          </CardContent>
        </Card>
      </div>
    </MainContent>
  )
}
