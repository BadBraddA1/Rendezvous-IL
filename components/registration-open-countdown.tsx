"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { REGISTRATION_OPEN_UTC_MS } from "@/lib/registration-open"

export interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

const EMAIL_MAX = 254
/** Practical client check — server still validates. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function useRegistrationOpenCountdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)
  const [registrationOpen, setRegistrationOpen] = useState(false)

  useEffect(() => {
    setMounted(true)

    const calculateTimeLeft = (): { open: boolean; left: TimeLeft } => {
      const difference = REGISTRATION_OPEN_UTC_MS - Date.now()

      if (difference > 0) {
        return {
          open: false,
          left: {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60),
          },
        }
      }

      return {
        open: true,
        left: { days: 0, hours: 0, minutes: 0, seconds: 0 },
      }
    }

    let timer: ReturnType<typeof setInterval> | null = null

    const apply = () => {
      const { open, left } = calculateTimeLeft()
      setRegistrationOpen(open)
      setTimeLeft(left)
      return open
    }

    const stop = () => {
      if (timer != null) {
        clearInterval(timer)
        timer = null
      }
    }

    const start = () => {
      stop()
      if (apply()) return
      timer = setInterval(() => {
        if (apply()) stop()
      }, 1000)
    }

    const onVisibility = () => {
      if (document.hidden) {
        stop()
        return
      }
      start()
    }

    start()
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return { timeLeft, mounted, registrationOpen }
}

export function RegistrationTimeBlock({
  value,
  label,
  padDays = false,
  pending = false,
}: {
  value: number
  label: string
  padDays?: boolean
  pending?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col items-center">
      <div className="flex h-[4.5rem] w-full max-w-[4.5rem] items-center justify-center countdown-digit-cell sm:h-24 sm:max-w-[6rem] md:h-28 md:max-w-[7rem]">
        <span
          className="registration-countdown-num tabular-nums"
          aria-hidden={pending || undefined}
        >
          {pending ? "—" : formatCountdownValue(value, padDays)}
        </span>
      </div>
      <span className="registration-countdown-label mt-2 text-xs text-on-surface sm:mt-3 sm:text-sm">
        {label}
      </span>
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
  const pending = !mounted
  const display = mounted ? timeLeft : { days: 0, hours: 0, minutes: 0, seconds: 0 }

  return (
    <div
      className={className}
      aria-label={pending ? "Loading time until registration opens" : "Time until registration opens"}
      role="timer"
      aria-live="off"
      aria-busy={pending || undefined}
    >
      <RegistrationTimeBlock value={display.days} label="Days" padDays pending={pending} />
      <RegistrationTimeBlock value={display.hours} label="Hours" pending={pending} />
      <RegistrationTimeBlock value={display.minutes} label="Minutes" pending={pending} />
      <RegistrationTimeBlock value={display.seconds} label="Seconds" pending={pending} />
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
  const abortRef = useRef<AbortController | null>(null)
  const successClearRef = useRef<number | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (successClearRef.current != null) window.clearTimeout(successClearRef.current)
    }
  }, [])

  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const trimmed = email.trim()
    if (!trimmed || !EMAIL_PATTERN.test(trimmed)) {
      setSubmitFeedback({
        type: "validation",
        message: "Enter an email address with an @ symbol, like name@example.com.",
      })
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsSubmitting(true)
    setSubmitFeedback(null)

    try {
      const response = await fetch("/api/notifications/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, notification_type: "registration_opening" }),
        signal: controller.signal,
      })

      if (!response.ok) {
        let message = "Something went wrong. Please try again."
        if (response.status === 429) {
          message = "Too many tries — wait a minute, then try again."
        } else {
          try {
            const body = (await response.json()) as { error?: string }
            if (typeof body.error === "string" && body.error.trim()) {
              message = body.error
            }
          } catch {
            // Non-JSON error body — keep generic message
          }
        }
        setSubmitFeedback({ type: "error", message })
        return
      }

      setSubmitFeedback({
        type: "success",
        message: "Thank you — we'll notify you when registration opens.",
      })
      setEmail("")
      if (successClearRef.current != null) window.clearTimeout(successClearRef.current)
      successClearRef.current = window.setTimeout(() => {
        setSubmitFeedback(null)
        successClearRef.current = null
      }, 4000)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      setSubmitFeedback({
        type: "error",
        message: "We couldn't reach the server. Check your connection and try again.",
      })
    } finally {
      if (!controller.signal.aborted) setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        onSubmit={handleEmailSubmit}
        className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
        noValidate
      >
        <label htmlFor="notify-email" className="sr-only">
          Email for a registration-opening notice
        </label>
        <Input
          id="notify-email"
          type="email"
          name="email"
          placeholder="Email for a reminder"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value.slice(0, EMAIL_MAX))
            if (submitFeedback?.type === "validation") {
              setSubmitFeedback(null)
            }
          }}
          disabled={isSubmitting}
          required
          maxLength={EMAIL_MAX}
          inputMode="email"
          enterKeyHint="send"
          className="h-11 min-w-0 flex-1 text-base"
          autoComplete="email"
          aria-invalid={submitFeedback?.type === "validation" ? true : undefined}
          aria-describedby={submitFeedback ? "notify-feedback" : undefined}
          aria-busy={isSubmitting || undefined}
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap"
        >
          <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
          {isSubmitting ? "Subscribing…" : "Notify me"}
        </Button>
      </form>

      {submitFeedback && (
        <div className="space-y-2">
          <p
            id="notify-feedback"
            key={submitFeedback.message}
            role={submitFeedback.type === "success" ? "status" : "alert"}
            aria-live={submitFeedback.type === "success" ? "polite" : "assertive"}
            className={`motion-status-enter text-sm text-pretty ${
              submitFeedback.type === "success"
                ? "text-success"
                : submitFeedback.type === "validation"
                  ? "text-warning"
                  : "text-destructive"
            }`}
          >
            {submitFeedback.message}
          </p>
          {submitFeedback.type === "error" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 bg-transparent"
              disabled={isSubmitting}
              onClick={() => {
                setSubmitFeedback(null)
                formRef.current?.requestSubmit()
              }}
            >
              Try again
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}

export function RegistrationOpenCta() {
  return (
    <div className="rounded-xl border border-primary/20 bg-surface-lake p-6 text-center md:p-8">
      <p className="mb-4 text-lead text-on-surface text-pretty">
        Registration is open for Rendezvous 2027.
      </p>
      <p className="mb-6 text-sm text-on-surface text-pretty">
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
