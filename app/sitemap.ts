import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/site-metadata"

/** Public marketing / family-discovery URLs only — no account, admin, or auth. */
const PUBLIC_PATHS = [
  "",
  "/about",
  "/schedule",
  "/biblebowl",
  "/faq",
  "/calculator",
  "/registration",
  "/gettheapp",
  "/map2026",
  "/privacy",
  "/scrabble",
  "/scrabble-rules",
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return PUBLIC_PATHS.map((path, i) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: path === "" || path === "/registration" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/registration" ? 0.9 : Math.max(0.5, 0.8 - i * 0.02),
  }))
}
