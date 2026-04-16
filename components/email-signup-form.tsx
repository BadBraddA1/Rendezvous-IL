"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, CheckCircle, Loader2 } from "lucide-react"

export function EmailSignupForm() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) return
    
    setStatus("loading")
    
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
        setMessage(data.message || "You're on the list!")
        setEmail("")
      } else {
        setStatus("error")
        setMessage(data.error || "Something went wrong. Please try again.")
      }
    } catch {
      setStatus("error")
      setMessage("Something went wrong. Please try again.")
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg bg-primary/10 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
          <CheckCircle className="h-6 w-6 text-primary" />
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
      <div className="flex items-center justify-center gap-2 mb-3">
        <Mail className="h-5 w-5 text-muted-foreground" />
        <span className="font-medium">Get Notified</span>
      </div>
      <p className="text-muted-foreground mb-4 text-center">
        Want to know when registration opens for Rendezvous 2027? Enter your email and we&apos;ll let you know!
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === "loading"}
          className="flex-1"
        />
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing up...
            </>
          ) : (
            "Notify Me"
          )}
        </Button>
      </form>
      {status === "error" && (
        <p className="mt-3 text-sm text-destructive text-center">{message}</p>
      )}
    </div>
  )
}
