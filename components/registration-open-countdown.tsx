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
      <div className="flex h-[4.5rem] w-full max-w-[4.5rem] items-center justify-center rounded-lg border border-primary/20 bg-card ring-1 ring-primary/5 sm:h-24 sm:max-w-[6rem] md:h-28 md:max-w-[7rem]">
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
  const [submitMessage, setSubmitMessage] = useState("")

  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!email || !email.includes("@")) {
      setSubmitMessage("Please enter a valid email address")
      return
    }

    setIsSubmitting(true)
    setSubmitMessage("")

    try {
      const response = await fetch("/api/notifications/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, notification_type: "registration_opening" }),
      })

      if (!response.ok) throw new Error("Failed to submit email")

      setSubmitMessage("Thank you — we'll notify you when registration opens.")
      setEmail("")
      setTimeout(() => setSubmitMessage(""), 4000)
    } catch {
      setSubmitMessage("Something went wrong. Please try again.")
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
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          className="h-11 flex-1 text-base"
          autoComplete="email"
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

      {submitMessage && (
        <p
          role="status"
          aria-live="polite"
          className={`text-sm ${submitMessage.startsWith("Thank you") ? "text-success" : "text-warning"}`}
        >
          {submitMessage}
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
        Secure your spot for May 3–7 at Lake Williamson Christian Center.
      </p>
      <Button size="lg" className="h-11 gap-2" asChild>
        <Link href="mailto:Stephen@Bradd.us">Contact us to register</Link>
      </Button>
    </div>
  )
}
