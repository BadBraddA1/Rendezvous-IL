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

interface CustomSignInFormProps {
  redirectUrl?: string
}

export function CustomSignInForm({ redirectUrl = "/account" }: CustomSignInFormProps) {
  const router = useRouter()
  const { isLoaded, signIn, setActive } = useSignIn()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!isLoaded || !signIn) return

    setError("")
    setLoading(true)

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      })

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId })
        router.push(redirectUrl)
        return
      }

      setError("Additional verification is required. Please contact support if this continues.")
    } catch (err) {
      setError(clerkErrorMessage(err, "Could not sign in. Check your email and password."))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    if (!isLoaded || !signIn) return

    setError("")
    setOauthLoading(true)

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sign-in/sso-callback",
        redirectUrlComplete: redirectUrl,
      })
    } catch (err) {
      setError(clerkErrorMessage(err, "Google sign-in is not available right now."))
      setOauthLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="sign-in-email">Email</Label>
        <Input
          id="sign-in-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="sign-in-password">Password</Label>
          <Link
            href={`/sign-in/forgot-password?redirect_url=${encodeURIComponent(redirectUrl)}`}
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="sign-in-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <Button type="submit" className="h-11 w-full" disabled={loading || oauthLoading || !isLoaded}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full bg-transparent"
        disabled={loading || oauthLoading || !isLoaded}
        onClick={handleGoogleSignIn}
      >
        {oauthLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirecting…
          </>
        ) : (
          "Continue with Google"
        )}
      </Button>
    </form>
  )
}
