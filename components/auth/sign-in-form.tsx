"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth, useSignIn } from "@clerk/nextjs"
import { authConfig } from "@/lib/auth-config"
import { afterAuth, authErrorHasCode, globalAuthError } from "@/lib/after-auth"
import { AuthPending } from "./auth-pending"
import { SocialButtons } from "./social-buttons"
import { useClerkReady } from "./use-clerk-ready"

/**
 * Identifier-first sign-in, like Clerk's widget (Core 3 SignInFuture API):
 *
 * 1. email step — signIn.create({ identifier }) looks the account up
 * 2. password step — greets the matched user by name ("Welcome back, Adin")
 * 3. code step — Device Trust (`needs_client_trust`) or email-code MFA
 *
 * Forgot password lives at its own route (authConfig.forgotPasswordUrl).
 *
 * Props override the authConfig defaults — for deep-link returns
 * (redirect_url via safeReturnPath) or a second flow on the same site
 * (e.g. a client portal with its own routes and landing page).
 */
export function SignInForm({
  afterUrl = authConfig.afterSignInUrl,
  signUpUrl = authConfig.signUpUrl,
  forgotPasswordUrl = authConfig.forgotPasswordUrl,
}: {
  afterUrl?: string
  signUpUrl?: string
  forgotPasswordUrl?: string
}) {
  const { signIn, errors, fetchStatus } = useSignIn()
  const { isSignedIn } = useAuth()
  const { ready, loadError } = useClerkReady()
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)
  const [handoff, setHandoff] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const busy = fetchStatus === "fetching"
  const globalErr = globalAuthError(errors)
  const bannerError = loadError || actionError || globalErr?.longMessage || globalErr?.message
  const finish = () => {
    setRedirecting(true)
    return signIn.finalize({ navigate: afterAuth(afterUrl) })
  }

  // Already signed in (or the session just activated): never show the form —
  // hard-navigate so the request carries the session cookie.
  useEffect(() => {
    if (isSignedIn) window.location.replace(afterUrl)
  }, [isSignedIn, afterUrl])

  // Hold the spinner until the browser actually leaves the page.
  if (redirecting || isSignedIn || signIn.status === "complete") {
    return <AuthPending label="Signing you in…" />
  }

  if (handoff) {
    return <AuthPending label="No account yet — let's create one…" />
  }

  async function handleEmail(formData: FormData) {
    setActionError(null)
    if (!ready) {
      setActionError(
        loadError ?? "Sign-in is still loading — wait a moment and try again.",
      )
      return
    }

    const identifier = formData.get("email") as string
    try {
      // Looks up the account and populates signIn.userData for the greeting.
      const { error } = await signIn.create({ identifier })

      // Unknown email: don't show an error — take them to sign-up with the
      // email carried over so they're helped along instead of dead-ended.
      if (authErrorHasCode(error, "form_identifier_not_found")) {
        setHandoff(true)
        router.push(`${signUpUrl}?email=${encodeURIComponent(identifier)}`)
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not check that email. Try again.",
      )
    }
  }

  async function handlePassword(formData: FormData) {
    setActionError(null)
    const password = formData.get("password") as string

    try {
      // No identifier param: continues the attempt created in handleEmail.
      const { error } = await signIn.password({ password })
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
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not sign you in. Try again.",
      )
    }
  }

  async function handleCode(formData: FormData) {
    setActionError(null)
    const code = formData.get("code") as string

    try {
      const { error } = await signIn.mfa.verifyEmailCode({ code })
      if (error) return

      if (signIn.status === "complete") await finish()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not verify that code. Try again.",
      )
    }
  }

  // Step 3: device-trust / MFA email code
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
            autoFocus
            className="ba-input"
            aria-invalid={Boolean(errors.fields.code)}
          />
          {errors.fields.code && (
            <p className="ba-error">{errors.fields.code.message}</p>
          )}
        </div>
        {bannerError && (
          <p className="ba-error">{bannerError}</p>
        )}
        <button type="submit" className="ba-button" disabled={busy || !ready}>
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

  // Step 2: password, greeting the matched account by name
  if (signIn.status === "needs_first_factor") {
    const firstName = signIn.userData?.firstName

    return (
      <form action={handlePassword} className="ba-form">
        <p className="ba-greeting">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </p>
        <div className="ba-identity">
          {signIn.userData?.hasImage && signIn.userData?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Clerk-hosted avatar, unknown remote host
            <img
              src={signIn.userData.imageUrl}
              alt=""
              className="ba-avatar"
            />
          ) : null}
          <span className="ba-identity-email">{signIn.identifier}</span>
          <button
            type="button"
            className="ba-link"
            onClick={() => signIn.reset()}
          >
            Not you?
          </button>
        </div>
        <div className="ba-field">
          <div className="ba-label-row">
            <label htmlFor="password" className="ba-label">
              Password
            </label>
            <Link href={forgotPasswordUrl} className="ba-link">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            className="ba-input"
            aria-invalid={Boolean(errors.fields.password)}
          />
          {errors.fields.password && (
            <p className="ba-error">{errors.fields.password.message}</p>
          )}
        </div>
        {bannerError && (
          <p className="ba-error">{bannerError}</p>
        )}
        <button type="submit" className="ba-button" disabled={busy || !ready}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    )
  }

  // Step 1: email
  return (
    <>
      <SocialButtons />
      <form action={handleEmail} className="ba-form">
        <div className="ba-field">
          <label htmlFor="email" className="ba-label">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className="ba-input"
            aria-invalid={Boolean(errors.fields.identifier)}
          />
          {errors.fields.identifier && (
            <p className="ba-error">{errors.fields.identifier.message}</p>
          )}
        </div>
        {bannerError && <p className="ba-error">{bannerError}</p>}
        {!ready && !loadError && (
          <p className="ba-hint">Loading sign-in…</p>
        )}
        <button type="submit" className="ba-button" disabled={busy || !ready}>
          {busy ? "Checking…" : "Continue"}
        </button>
      </form>
    </>
  )
}
