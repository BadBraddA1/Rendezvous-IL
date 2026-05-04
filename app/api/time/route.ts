// Server-side Central Time endpoint.
//
// Smart-TV browsers and embedded webviews frequently have miscalibrated
// system clocks (sometimes off by hours, sometimes stuck at boot time, sometimes
// in the wrong timezone). Computing "now" client-side via `new Date()` is
// therefore unreliable on the LU page that drives a public TV display.
//
// This route returns the *server's* current time — which always has accurate
// UTC from Vercel's infrastructure — already broken into Central Time fields
// so the client doesn't need to do any timezone math itself.
//
// The client polls this route on a slow interval and interpolates between
// polls using its own clock's elapsed-time delta (which is reliable even when
// the absolute time isn't).

import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "edge"

export function GET() {
  const now = new Date()

  // Use Intl.DateTimeFormat with timeZone — this runs on the server (Node /
  // edge runtime) where ICU support is guaranteed, so we don't have the
  // browser compatibility issues that affect smart-TV clients.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(now)

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)

  let hour = get("hour")
  // Some Intl implementations report 24 instead of 0 for midnight in 24h mode.
  if (hour === 24) hour = 0

  return NextResponse.json(
    {
      // ISO timestamp of the server's UTC clock — useful for debugging.
      utc: now.toISOString(),
      // Pre-broken-down Central Time fields. The client uses these directly.
      central: {
        year: get("year"),
        month: get("month"), // 1-12
        day: get("day"), // 1-31
        hour, // 0-23
        minute: get("minute"),
        second: get("second"),
      },
    },
    {
      headers: {
        // Tell every layer of caching to leave this alone.
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    }
  )
}
