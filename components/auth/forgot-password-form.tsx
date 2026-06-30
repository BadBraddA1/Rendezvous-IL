"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSignIn } from "@clerk/nextjs"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { clerkErrorMessage } from "@/lib/clerk-errors"

interface ForgotPasswordFormProps {
  redirectUrl?: string
}

export function ForgotPasswordForm({ redirectUrl = "/account" }: ForgotPasswordFormProps) {
  const router = useRouter()
  const { isLoaded, signIn, setActive } = useSignIn()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [step, setStep] = useState<"request" | "reset">("request")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleRequestCode(event: React.FormEvent) {
    event.preventDefault()
    if (!isLoaded || !signIn) return

    setError("")
    setMessage("")
    setLoading(true)

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      })
      await signIn.prepareFirstFactor({
        strategy: "reset_password_email_code",
      })
      setStep("reset")
      setMessage(`We sent a reset code to ${email.trim()}.`)
    } catch (err) {
      setError(clerkErrorMessage(err, "Could not send a reset code. Check the email and try again."))
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault()
    if (!isLoaded || !signIn) return

    setError("")
    setLoading(true)

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password,
      })

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId })
        router.push(redirectUrl)
        return
      }

      setError("Password reset could not be completed. Try again or request a new code.")
    } catch (err) {
      setError(clerkErrorMessage(err, "Invalid code or password. Please try again."))
    } finally {
      setLoading(false)
    }
  }

  if (step === "reset") {
    return (
      <form onSubmit={handleResetPassword} className="space-y-4">
        {message && (
          <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="reset-code">Reset code</Label>
          <Input
            id="reset-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-password">New password</Label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <Button type="submit" className="h-11 w-full" disabled={loading || !isLoaded}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating password…
            </>
          ) : (
            "Set new password"
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={loading}
          onClick={() => {
            setStep("request")
            setCode("")
            setPassword("")
            setError("")
            setMessage("")
          }}
        >
          Request a new code
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={handleRequestCode} className="space-y-4">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        Enter the email on your account. We&apos;ll send a code to reset your password.
      </p>

      <div className="space-y-2">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <Button type="submit" className="h-11 w-full" disabled={loading || !isLoaded}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending code…
          </>
        ) : (
          "Send reset code"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
