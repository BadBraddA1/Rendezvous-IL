"use client"

import dynamic from "next/dynamic"
import { ViewLoading } from "@/components/live-updates/view-loading"

export const AllView = dynamic(
  () => import("@/components/live-updates/views/all-view").then((m) => ({ default: m.AllView })),
  { loading: () => <ViewLoading />, ssr: false },
)
export const WeatherView = dynamic(
  () => import("@/components/live-updates/views/weather-view").then((m) => ({ default: m.WeatherView })),
  { loading: () => <ViewLoading />, ssr: false },
)
export const ScheduleView = dynamic(
  () => import("@/components/live-updates/views/schedule-view").then((m) => ({ default: m.ScheduleView })),
  { loading: () => <ViewLoading />, ssr: false },
)
export const MealView = dynamic(
  () => import("@/components/live-updates/views/meal-view").then((m) => ({ default: m.MealView })),
  { loading: () => <ViewLoading />, ssr: false },
)
export const MapView = dynamic(
  () => import("@/components/live-updates/views/map-view").then((m) => ({ default: m.MapView })),
  { loading: () => <ViewLoading />, ssr: false },
)
export const VolunteersView = dynamic(
  () => import("@/components/live-updates/views/volunteers-view").then((m) => ({ default: m.VolunteersView })),
  { loading: () => <ViewLoading />, ssr: false },
)
export const AnnouncementsView = dynamic(
  () => import("@/components/live-updates/views/announcements-view").then((m) => ({ default: m.AnnouncementsView })),
  { loading: () => <ViewLoading />, ssr: false },
)
export const WifiView = dynamic(
  () => import("@/components/live-updates/views/wifi-view").then((m) => ({ default: m.WifiView })),
  { loading: () => <ViewLoading />, ssr: false },
)
export const UpcomingView = dynamic(
  () => import("@/components/live-updates/views/upcoming-view").then((m) => ({ default: m.UpcomingView })),
  { loading: () => <ViewLoading />, ssr: false },
)

/** Warm view chunks after first paint so auto-rotate stays smooth on TVs. */
export function prefetchLiveUpdateViews() {
  void import("@/components/live-updates/views/all-view")
  void import("@/components/live-updates/views/weather-view")
  void import("@/components/live-updates/views/schedule-view")
  void import("@/components/live-updates/views/meal-view")
  void import("@/components/live-updates/views/map-view")
  void import("@/components/live-updates/views/volunteers-view")
  void import("@/components/live-updates/views/announcements-view")
  void import("@/components/live-updates/views/wifi-view")
  void import("@/components/live-updates/views/upcoming-view")
}
