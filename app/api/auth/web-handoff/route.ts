import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"
import { authUserId } from "@/lib/clerk-auth"
import { safeReturnPath } from "@/lib/after-auth"

/**
 * Site origin for the handoff deep link.
 * Prefer the request host (apps already hit production/preview on the right
 * domain). `NEXT_PUBLIC_APP_URL` is only a fallback — and must be a real
 * absolute URL. A scheme-less or garbage env used to throw in `new URL`,
 * 500 the mint, and send Safari to unsigned /account → “Welcome back”.
 */
function appOrigin(request: Request): string {
  try {
    const fromRequest = new URL(request.url).origin
    if (fromRequest.startsWith("http")) return fromRequest
  } catch {
    // fall through
  }

  const raw = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "")
  if (raw) {
    try {
      const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
      const parsed = new URL(withScheme)
      // Reject values that aren't real hosts (e.g. typo envs with no TLD).
      if (
        parsed.origin.startsWith("http") &&
        (parsed.hostname === "localhost" || parsed.hostname.includes("."))
      ) {
        return parsed.origin
      }
    } catch {
      // fall through
    }
  }

  return "https://rendezvousil.com"
}

/**
 * Mint a short-lived Clerk sign-in token so a native app session can open
 * Safari already logged in (app → web handoff).
 *
 * POST { redirect_url?: "/account" } + Bearer session JWT
 * → { url: "https://…/sso-handoff?ticket=…&redirect_url=…" }
 */
export async function POST(request: Request) {
  const userId = await authUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let redirectPath = "/account"
  try {
    const body = (await request.json()) as { redirect_url?: string }
    redirectPath = safeReturnPath(body.redirect_url) || "/account"
  } catch {
    // empty body is fine
  }

  try {
    const clerk = await clerkClient()
    const signInToken = await clerk.signInTokens.createSignInToken({
      userId,
      expiresInSeconds: 120,
    })

    const url = new URL("/sso-handoff", appOrigin(request))
    url.searchParams.set("ticket", signInToken.token)
    url.searchParams.set("redirect_url", redirectPath)

    return NextResponse.json({
      url: url.toString(),
      expiresInSeconds: 120,
    })
  } catch (error) {
    console.error("[web-handoff] Failed to mint sign-in token:", error)
    return NextResponse.json({ error: "Failed to create handoff" }, { status: 500 })
  }
}
