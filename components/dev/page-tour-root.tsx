"use client"

import dynamic from "next/dynamic"

const PageTourOverlay = dynamic(
  () => import("@/components/dev/page-tour-overlay").then((mod) => mod.PageTourOverlay),
  { ssr: false },
)

/** Dev-only tour chrome — tree-shaken from production via early return inside overlay. */
export function PageTourRoot() {
  if (process.env.NODE_ENV !== "development") return null
  return <PageTourOverlay />
}
