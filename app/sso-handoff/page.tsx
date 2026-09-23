"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth, useSignIn } from "@clerk/nextjs"
import { AuthPending } from "@/components/auth/auth-pending"
import { afterAuth, safeReturnPath } from "@/lib/after-auth"

/**
 * Redeems a Clerk sign-in token minted by POST /api/auth/web-handoff
 * (native app → website session). One-time ticket, ~2 minutes.
 */
function SsoHandoffInner() {
  const search = useSearchParams()
  const ticket = search.get("ticket") || search.get("__clerk_ticket")
  const redirectUrl = safeReturnPath(search.get("redirect_url") || undefined) || "/account"

  const { isLoaded, isSignedIn } = useAuth()
  const { signIn } = useSignIn()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!isLoaded || started.current) return

    if (isSignedIn) {
      started.current = true
      window.location.replace(redirectUrl)
      return
    }

    if (!ticket) {
      setError("Missing sign-in ticket. Open the link from the app again.")
      return
    }

    if (!signIn) return

    started.current = true
    void (async () => {
      try {
        const { error: ticketError } = await signIn.create({
          strategy: "ticket",
          ticket,
        })
        if (ticketError) {
          setError(ticketError.longMessage || ticketError.message || "Sign-in failed")
          return
        }

        if (signIn.status === "complete") {
          await signIn.finalize({ navigate: afterAuth(redirectUrl) })
          return
        }

        setError("Could not complete sign-in from the app link. Try signing in on the website.")
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign-in failed"
        setError(message)
      }
    })()
  }, [isLoaded, isSignedIn, ticket, redirectUrl, signIn])

  if (error) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold">Couldn&apos;t finish signing you in</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <a
          className="text-sm font-medium text-primary underline"
          href={`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`}
        >
          Sign in on the website
        </a>
      </main>
    )
  }

  return <AuthPending label="Signing you in from the app…" />
}

export default function SsoHandoffPage() {
  return (
    <Suspense fallback={<AuthPending label="Signing you in from the app…" />}>
      <SsoHandoffInner />
    </Suspense>
  )
}
