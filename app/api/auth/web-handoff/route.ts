import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"
import { authUserId } from "@/lib/clerk-auth"
import { safeReturnPath } from "@/lib/after-auth"

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

    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      new URL(request.url).origin ||
      "https://rendezvousil.com"

    const url = new URL("/sso-handoff", origin)
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
