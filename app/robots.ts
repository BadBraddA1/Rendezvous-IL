import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/site-metadata"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/account",
        "/api",
        "/sign-in",
        "/sign-up",
        "/forgot-password",
        "/sso-callback",
        "/sso-handoff",
        "/chat",
        "/directory",
        "/messaging",
        "/dev",
        "/silent",
        "/geocode",
        "/map-editor",
        "/eod",
        "/lesson-bid",
        "/wapi",
        "/registration-test2026",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
