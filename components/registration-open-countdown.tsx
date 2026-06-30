"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

const REGISTRATION_OPEN_UTC = Date.UTC(2027, 0, 1, 6, 0, 0) // Jan 1, 2027 midnight CST

export function useRegistrationOpenCountdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)
  const [registrationOpen, setRegistrationOpen] = useState(false)

  useEffect(() => {
    setMounted(true)

    const calculateTimeLeft = (): TimeLeft => {
      const difference = REGISTRATION_OPEN_UTC - Date.now()

      if (difference > 0) {
        setRegistrationOpen(false)
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        }
      }

      setRegistrationOpen(true)
      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }

    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return { timeLeft, mounted, registrationOpen }
}

export function RegistrationTimeBlock({ value, label, padDays = false }: { value: number; label: string; padDays?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-[4.5rem] w-full max-w-[4.5rem] items-center justify-center countdown-digit-cell sm:h-24 sm:max-w-[6rem] md:h-28 md:max-w-[7rem]">
        <span className="registration-countdown-num tabular-nums">
          {formatCountdownValue(value, padDays)}
        </span>
      </div>
      <span className="registration-countdown-label mt-2 text-xs text-muted-foreground sm:mt-3 sm:text-sm">{label}</span>
    </div>
  )
}

function formatCountdownValue(value: number, padDays = false) {
  return padDays ? String(value) : String(value).padStart(2, "0")
}

export function RegistrationCountdownGrid({
  timeLeft,
  mounted,
  className,
}: {
  timeLeft: TimeLeft
  mounted: boolean
  className?: string
}) {
  const display = mounted ? timeLeft : { days: 0, hours: 0, minutes: 0, seconds: 0 }

  return (
    <div className={className} aria-label="Time until registration opens" role="timer" aria-live="off">
      <RegistrationTimeBlock value={display.days} label="Days" padDays />
      <RegistrationTimeBlock value={display.hours} label="Hours" />
      <RegistrationTimeBlock value={display.minutes} label="Minutes" />
      <RegistrationTimeBlock value={display.seconds} label="Seconds" />
    </div>
  )
}

export function RegistrationNotifySection() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitFeedback, setSubmitFeedback] = useState<{
    type: "success" | "error" | "validation"
    message: string
  } | null>(null)

  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!email || !email.includes("@")) {
      setSubmitFeedback({
        type: "validation",
        message: "Enter an email address with an @ symbol, like name@example.com.",
      })
      return
    }

    setIsSubmitting(true)
    setSubmitFeedback(null)

    try {
      const response = await fetch("/api/notifications/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, notification_type: "registration_opening" }),
      })

      if (!response.ok) {
        let message = "Something went wrong. Please try again."
        try {
          const body = (await response.json()) as { error?: string }
          if (typeof body.error === "string" && body.error.trim()) {
            message = body.error
          }
        } catch {
          // Non-JSON error body — keep generic message
        }
        setSubmitFeedback({ type: "error", message })
        return
      }

      setSubmitFeedback({
        type: "success",
        message: "Thank you — we'll notify you when registration opens.",
      })
      setEmail("")
      setTimeout(() => setSubmitFeedback(null), 4000)
    } catch {
      setSubmitFeedback({
        type: "error",
        message: "We couldn't reach the server. Check your connection and try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Get notified when registration opens by joining our{" "}
        <a
          href="https://www.facebook.com/groups/RendezvousIL"
          target="_blank"
          rel="noreferrer noopener"
          className="focus-ring rounded-sm font-medium text-primary hover:underline"
        >
          Facebook group
        </a>
      </p>

      <form onSubmit={handleEmailSubmit} className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
        <label htmlFor="notify-email" className="sr-only">
          Email address for registration opening notification
        </label>
        <Input
          id="notify-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (submitFeedback?.type === "validation") {
              setSubmitFeedback(null)
            }
          }}
          disabled={isSubmitting}
          className="h-11 flex-1 text-base"
          autoComplete="email"
          aria-invalid={submitFeedback?.type === "validation" ? true : undefined}
          aria-describedby={submitFeedback ? "notify-feedback" : undefined}
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 items-center justify-center gap-2 whitespace-nowrap"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          {isSubmitting ? "Subscribing…" : "Notify me"}
        </Button>
      </form>

      {submitFeedback && (
        <p
          id="notify-feedback"
          key={submitFeedback.message}
          role={submitFeedback.type === "success" ? "status" : "alert"}
          aria-live={submitFeedback.type === "success" ? "polite" : "assertive"}
          className={`motion-status-enter text-sm ${
            submitFeedback.type === "success"
              ? "text-success"
              : submitFeedback.type === "validation"
                ? "text-warning"
                : "text-destructive"
          }`}
        >
          {submitFeedback.message}
        </p>
      )}
    </div>
  )
}

export function RegistrationOpenCta() {
  return (
    <div className="rounded-xl border border-primary/20 bg-surface-lake p-6 text-center md:p-8">
      <p className="mb-4 text-lead text-on-surface">Registration is open for Rendezvous 2027.</p>
      <p className="mb-6 text-sm text-on-surface/80">
        Email Stephen to begin registration for May 3–7 at Lake Williamson Christian Center.
      </p>
      <Button size="lg" className="h-11 gap-2" asChild>
        <Link href="mailto:Stephen@Bradd.us?subject=Rendezvous%202027%20Registration">
          Email Stephen to register
        </Link>
      </Button>
    </div>
  )
}
