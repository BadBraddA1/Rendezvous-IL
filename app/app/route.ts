import { NextResponse } from "next/server"
import { resolveStoreRedirectUrl } from "@/lib/app-store-redirect"

export const dynamic = "force-dynamic"

/**
 * Smart store hop: iPhone/iPad → App Store, Android → Play (when live),
 * everything else → /gettheapp landing.
 */
export function GET(request: Request) {
  const ua = request.headers.get("user-agent")
  const storeUrl = resolveStoreRedirectUrl(ua)
  const target = storeUrl ?? new URL("/gettheapp", request.url).toString()
  return NextResponse.redirect(target, 302)
}
