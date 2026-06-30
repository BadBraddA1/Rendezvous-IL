"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, CheckCircle, Loader2 } from "lucide-react"

export function EmailSignupForm() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.includes("@")) {
      setStatus("error")
      setMessage("Enter an email address with an @ symbol, like name@example.com.")
      return
    }

    setStatus("loading")
    setMessage("")

    try {
      const response = await fetch("/api/email-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus("success")
        setMessage(data.message || "You're on the list.")
        setEmail("")
      } else {
        setStatus("error")
        setMessage(
          data.error ||
            "We couldn't add your email right now. Try again, or join our Facebook group for updates.",
        )
      }
    } catch {
      setStatus("error")
      setMessage("We couldn't reach the server. Check your connection and try again.")
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg bg-primary/10 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
          <CheckCircle className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <p className="font-medium text-primary">{message}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ll email you when registration opens for Rendezvous 2027.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-muted/50 p-6">
      <div className="mb-3 flex items-center justify-center gap-2">
        <Mail className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <span className="font-medium">Get notified</span>
      </div>
      <p className="mb-4 text-center text-muted-foreground">
        Registration opens January 1, 2027. Leave your email and we&apos;ll remind you.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="signup-email" className="sr-only">
            Email address
          </Label>
          <Input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (status === "error") {
                setStatus("idle")
                setMessage("")
              }
            }}
            required
            disabled={status === "loading"}
            aria-invalid={status === "error" ? true : undefined}
            aria-describedby={status === "error" ? "signup-error" : undefined}
            className="flex-1"
            autoComplete="email"
          />
        </div>
        <Button type="submit" disabled={status === "loading"} className="min-h-11">
          {status === "loading" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            "Notify me"
          )}
        </Button>
      </form>
      {status === "error" && (
        <p id="signup-error" role="alert" className="mt-3 text-center text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  )
}
