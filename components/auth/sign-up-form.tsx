"use client"

import { useEffect, useState } from "react"
import { useAuth, useSignUp } from "@clerk/nextjs"
import { authConfig } from "@/lib/auth-config"
import { afterAuth, globalAuthError } from "@/lib/after-auth"
import { AuthPending } from "./auth-pending"
import { SocialButtons } from "./social-buttons"
import { useClerkReady } from "./use-clerk-ready"

/**
 * Email + password sign-up with email-code verification
 * (Clerk Core 3 SignUpFuture API).
 *
 * The empty #clerk-captcha div is REQUIRED — Clerk mounts its bot
 * protection there. Removing it breaks sign-up in production.
 */
export function SignUpForm({
  prefillEmail,
  afterUrl = authConfig.afterSignUpUrl,
}: {
  prefillEmail?: string
  /** Override for secondary flows (e.g. a client portal landing page). */
  afterUrl?: string
}) {
  const { signUp, errors, fetchStatus } = useSignUp()
  const { isSignedIn } = useAuth()
  const { ready, loadError } = useClerkReady()
  const [redirecting, setRedirecting] = useState(false)
  const [awaitingVerification, setAwaitingVerification] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const busy = fetchStatus === "fetching"
  const globalErr = globalAuthError(errors)
  const bannerError = loadError || actionError || globalErr?.longMessage || globalErr?.message

  // Session already active (or just activated): hard-navigate away so the
  // request carries the session cookie instead of re-showing the form.
  useEffect(() => {
    if (isSignedIn) window.location.replace(afterUrl)
  }, [isSignedIn, afterUrl])

  async function handleSubmit(formData: FormData) {
    setActionError(null)
    if (!ready) {
      setActionError(
        loadError ?? "Sign-up is still loading — wait a moment and try again.",
      )
      return
    }

    const emailAddress = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const { error } = await signUp.password({
        emailAddress,
        password,
        ...(authConfig.collectName
          ? {
              firstName: formData.get("firstName") as string,
              lastName: formData.get("lastName") as string,
            }
          : {}),
      })
      if (error) return

      const send = await signUp.verifications.sendEmailCode()
      if (send.error) return

      setAwaitingVerification(true)
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Could not create your account. Try again.",
      )
    }
  }

  async function handleVerify(formData: FormData) {
    setActionError(null)
    const code = formData.get("code") as string

    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code })
      if (error) return

      if (signUp.status === "complete") {
        setRedirecting(true)
        await signUp.finalize({
          navigate: afterAuth(afterUrl),
        })
        return
      }

      setActionError("Verification didn't finish — check the code and try again.")
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not verify that code. Try again.",
      )
    }
  }

  // Hold the spinner until the browser actually leaves the page.
  if (redirecting || isSignedIn || signUp.status === "complete") {
    return <AuthPending label="Setting up your account…" />
  }

  const verifying =
    awaitingVerification ||
    (signUp.status === "missing_requirements" &&
      signUp.unverifiedFields.includes("email_address") &&
      signUp.missingFields.length === 0)

  if (verifying) {
    return (
      <form action={handleVerify} className="ba-form">
        <p className="ba-hint">
          Enter the code we sent to{" "}
          <strong>{signUp.emailAddress || "your email"}</strong>.
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
        {bannerError && <p className="ba-error">{bannerError}</p>}
        <button type="submit" className="ba-button" disabled={busy || !ready}>
          {busy ? "Verifying…" : "Verify email"}
        </button>
        <button
          type="button"
          className="ba-link"
          onClick={async () => {
            setActionError(null)
            const send = await signUp.verifications.sendEmailCode()
            if (send.error) return
          }}
        >
          Send a new code
        </button>
      </form>
    )
  }

  return (
    <>
      {/* Set when sign-in hands off an unknown email — a nudge, not an error. */}
      {prefillEmail && (
        <p className="ba-hint">
          We didn&apos;t find an account for <strong>{prefillEmail}</strong>,
          so let&apos;s create one — it only takes a minute.
        </p>
      )}
      <SocialButtons />
      <form action={handleSubmit} className="ba-form">
        {authConfig.collectName && (
          <div className="ba-field-row">
            <div className="ba-field">
              <label htmlFor="firstName" className="ba-label">
                First name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                className="ba-input"
              />
            </div>
            <div className="ba-field">
              <label htmlFor="lastName" className="ba-label">
                Last name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                className="ba-input"
              />
            </div>
          </div>
        )}
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
            defaultValue={prefillEmail}
            className="ba-input"
            aria-invalid={Boolean(errors.fields.emailAddress)}
          />
          {errors.fields.emailAddress && (
            <p className="ba-error">{errors.fields.emailAddress.message}</p>
          )}
        </div>
        <div className="ba-field">
          <label htmlFor="password" className="ba-label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="ba-input"
            aria-invalid={Boolean(errors.fields.password)}
          />
          {errors.fields.password && (
            <p className="ba-error">{errors.fields.password.message}</p>
          )}
        </div>
        {bannerError && <p className="ba-error">{bannerError}</p>}
        {!ready && !loadError && (
          <p className="ba-hint">Loading sign-up…</p>
        )}
        <button
          type="submit"
          className="ba-button"
          disabled={busy || !ready}
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
        {/* Required: Clerk bot protection mounts here. Do not remove. */}
        <div id="clerk-captcha" />
      </form>
    </>
  )
}
