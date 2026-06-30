"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSignUp } from "@clerk/nextjs"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { clerkErrorMessage } from "@/lib/clerk-errors"

interface CustomSignUpFormProps {
  redirectUrl?: string
}

export function CustomSignUpForm({ redirectUrl = "/account" }: CustomSignUpFormProps) {
  const router = useRouter()
  const { isLoaded, signUp, setActive } = useSignUp()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [pendingVerification, setPendingVerification] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault()
    if (!isLoaded || !signUp) return

    setError("")
    setLoading(true)

    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      })

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      setPendingVerification(true)
    } catch (err) {
      setError(clerkErrorMessage(err, "Could not create your account. Please try again."))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault()
    if (!isLoaded || !signUp) return

    setError("")
    setLoading(true)

    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() })

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId })
        router.push(redirectUrl)
        return
      }

      setError("Verification could not be completed. Check the code and try again.")
    } catch (err) {
      setError(clerkErrorMessage(err, "Invalid verification code."))
    } finally {
      setLoading(false)
    }
  }

  if (pendingVerification) {
    return (
      <form onSubmit={handleVerify} className="space-y-4">
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <p className="text-sm text-muted-foreground">
          We sent a verification code to <span className="font-medium text-foreground">{email}</span>.
        </p>

        <div className="space-y-2">
          <Label htmlFor="sign-up-code">Verification code</Label>
          <Input
            id="sign-up-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="123456"
          />
        </div>

        <Button type="submit" className="h-11 w-full" disabled={loading || !isLoaded}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying…
            </>
          ) : (
            "Verify and continue"
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={loading}
          onClick={() => {
            setPendingVerification(false)
            setCode("")
            setError("")
          }}
        >
          Use a different email
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sign-up-first-name">First name</Label>
          <Input
            id="sign-up-first-name"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sign-up-last-name">Last name</Label>
          <Input
            id="sign-up-last-name"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sign-up-email">Email</Label>
        <Input
          id="sign-up-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sign-up-password">Password</Label>
        <Input
          id="sign-up-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>

      <Button type="submit" className="h-11 w-full" disabled={loading || !isLoaded}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  )
}
