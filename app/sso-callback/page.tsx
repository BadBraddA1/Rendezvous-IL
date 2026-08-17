"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs"
import { authConfig } from "@/lib/auth-config"
import { afterAuth } from "@/lib/after-auth"

/**
 * OAuth return route. Handles the four outcomes Clerk can hand back:
 * completed sign-in, completed sign-up, a sign-up that matches an existing
 * user (transfer to sign-in), and a sign-in with no matching user
 * (transfer to sign-up). Anything needing more input goes back to /sign-in.
 */
export default function SsoCallbackPage() {
  const clerk = useClerk()
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const router = useRouter()
  const hasRun = useRef(false)

  useEffect(() => {
    ;(async () => {
      if (!clerk.loaded || hasRun.current) return
      hasRun.current = true

      const finishSignIn = () =>
        signIn.finalize({ navigate: afterAuth(authConfig.afterSignInUrl) })
      const finishSignUp = () =>
        signUp.finalize({ navigate: afterAuth(authConfig.afterSignUpUrl) })

      if (signIn.status === "complete") {
        await finishSignIn()
        return
      }

      // OAuth sign-up matched an existing user: convert to a sign-in.
      if (signUp.isTransferable) {
        await signIn.create({ transfer: true })
        if ((signIn.status as string) === "complete") {
          await finishSignIn()
          return
        }
        router.push(authConfig.signInUrl)
        return
      }

      if (
        signIn.status === "needs_first_factor" &&
        !signIn.supportedFirstFactors?.every((f) => f.strategy === "enterprise_sso")
      ) {
        router.push(authConfig.signInUrl)
        return
      }

      // OAuth sign-in had no matching user: convert to a sign-up.
      if (signIn.isTransferable) {
        await signUp.create({ transfer: true })
        if (signUp.status === "complete") {
          await finishSignUp()
          return
        }
        // Extra required fields (name, legal, …) — send to sign-up to finish.
        router.push(authConfig.signUpUrl)
        return
      }

      if (signUp.status === "complete") {
        await finishSignUp()
        return
      }

      if (signIn.status === "needs_second_factor" || signIn.status === "needs_new_password") {
        router.push(authConfig.signInUrl)
        return
      }

      // Account already has an active session on this client.
      const sessionId =
        signIn.existingSession?.sessionId || signUp.existingSession?.sessionId
      if (sessionId) {
        await clerk.setActive({
          session: sessionId,
          navigate: afterAuth(authConfig.afterSignInUrl),
        })
      }
    })()
  }, [clerk, signIn, signUp, router])

  return (
    <div className="ba-page">
      <p className="ba-hint">Finishing sign in…</p>
      {/* A transferred sign-up may need captcha verification. */}
      <div id="clerk-captcha" />
    </div>
  )
}
