"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useAuth, useSignIn } from "@clerk/nextjs"
import { authConfig } from "@/lib/auth-config"
import { afterAuth, globalAuthError } from "@/lib/after-auth"
import { SocialButtons } from "./social-buttons"

/**
 * Email + password sign-in (Clerk Core 3 SignInFuture API).
 *
 * Handles:
 * - password sign-in
 * - Device Trust (`needs_client_trust`): new browser → email code check
 * - basic email-code MFA (`needs_second_factor`)
 *
 * Forgot password lives at its own route (authConfig.forgotPasswordUrl).
 */
export function SignInForm() {
  const { signIn, errors, fetchStatus } = useSignIn()
  const { isSignedIn } = useAuth()
  const busy = fetchStatus === "fetching"
  const globalErr = globalAuthError(errors)
  const finish = () =>
    signIn.finalize({ navigate: afterAuth(authConfig.afterSignInUrl) })

  // Already signed in (or the session just activated): never show the form —
  // hard-navigate so the request carries the session cookie.
  useEffect(() => {
    if (isSignedIn) window.location.replace(authConfig.afterSignInUrl)
  }, [isSignedIn])

  if (isSignedIn) return null

  async function handlePassword(formData: FormData) {
    const emailAddress = formData.get("email") as string
    const password = formData.get("password") as string

    const { error } = await signIn.password({ emailAddress, password })
    if (error) return

    if (signIn.status === "complete") {
      await finish()
    } else if (
      signIn.status === "needs_client_trust" ||
      signIn.status === "needs_second_factor"
    ) {
      // New device or MFA — email code is the default second-factor strategy.
      await signIn.mfa.sendEmailCode()
    }
  }

  async function handleCode(formData: FormData) {
    const code = formData.get("code") as string

    const { error } = await signIn.mfa.verifyEmailCode({ code })
    if (error) return

    if (signIn.status === "complete") await finish()
  }

  if (
    signIn.status === "needs_client_trust" ||
    signIn.status === "needs_second_factor"
  ) {
    return (
      <form action={handleCode} className="ba-form">
        <p className="ba-hint">
          We emailed you a code to confirm it&apos;s really you.
        </p>
        <div className="ba-field">
          <label htmlFor="code" className="ba-label">
            Verification code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            className="ba-input"
            aria-invalid={Boolean(errors.fields.code)}
          />
          {errors.fields.code && (
            <p className="ba-error">{errors.fields.code.message}</p>
          )}
        </div>
        {globalErr && (
          <p className="ba-error">{globalErr.longMessage ?? globalErr.message}</p>
        )}
        <button type="submit" className="ba-button" disabled={busy}>
          {busy ? "Verifying…" : "Verify"}
        </button>
        <button
          type="button"
          className="ba-link"
          onClick={() => signIn.mfa.sendEmailCode()}
        >
          Send a new code
        </button>
        <button type="button" className="ba-link" onClick={() => signIn.reset()}>
          Start over
        </button>
      </form>
    )
  }

  return (
    <>
      <SocialButtons />
      <form action={handlePassword} className="ba-form">
        <div className="ba-field">
          <label htmlFor="email" className="ba-label">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="ba-input"
            aria-invalid={Boolean(errors.fields.identifier)}
          />
          {errors.fields.identifier && (
            <p className="ba-error">{errors.fields.identifier.message}</p>
          )}
        </div>
        <div className="ba-field">
          <div className="ba-label-row">
            <label htmlFor="password" className="ba-label">
              Password
            </label>
            <Link href={authConfig.forgotPasswordUrl} className="ba-link">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="ba-input"
            aria-invalid={Boolean(errors.fields.password)}
          />
          {errors.fields.password && (
            <p className="ba-error">{errors.fields.password.message}</p>
          )}
        </div>
        {globalErr && (
          <p className="ba-error">{globalErr.longMessage ?? globalErr.message}</p>
        )}
        <button type="submit" className="ba-button" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </>
  )
}
