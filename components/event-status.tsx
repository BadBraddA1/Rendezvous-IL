"use client"

import { useEffect, useState } from "react"
import { Clock, MapPin, Radio, CalendarX, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

type EventPhase = "registration-open" | "registration-closed" | "event-live" | "post-event"

// Key dates (all in UTC, offset for Central Time = UTC-5 in May)
const REGISTRATION_DEADLINE = Date.UTC(2026, 3, 15, 16, 59, 0) // Apr 15, 2026 11:59 PM CT
const EVENT_START = Date.UTC(2026, 4, 4, 18, 0, 0)             // May 4, 2026 1:00 PM CT
const EVENT_END = Date.UTC(2026, 4, 8, 17, 0, 0)               // May 8, 2026 12:00 PM CT

function getPhase(now: number): EventPhase {
  if (now < REGISTRATION_DEADLINE) return "registration-open"
  if (now < EVENT_START) return "registration-closed"
  if (now < EVENT_END) return "event-live"
  return "post-event"
}

function calculateTimeLeft(target: number, now: number): TimeLeft {
  const diff = target - now
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-lg sm:h-24 sm:w-24 md:h-28 md:w-28">
        <span className="text-3xl font-bold tabular-nums sm:text-4xl md:text-5xl">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  )
}

export function EventStatus() {
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<EventPhase>("registration-closed")
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    setMounted(true)

    const tick = () => {
      const now = Date.now()
      const currentPhase = getPhase(now)
      setPhase(currentPhase)

      if (currentPhase === "registration-open") {
        setTimeLeft(calculateTimeLeft(REGISTRATION_DEADLINE, now))
      } else if (currentPhase === "registration-closed") {
        setTimeLeft(calculateTimeLeft(EVENT_START, now))
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      }
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  if (!mounted) {
    return (
      <div className="flex min-h-[220px] items-center justify-center">
        <div className="flex gap-4">
          {["Days", "Hours", "Minutes", "Seconds"].map((l) => (
            <CountdownUnit key={l} value={0} label={l} />
          ))}
        </div>
      </div>
    )
  }

  // ----- LIVE STATE -----
  if (phase === "event-live") {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-3 rounded-full bg-green-500/15 px-6 py-3 text-green-700 dark:text-green-400">
          <Radio className="h-5 w-5 animate-pulse" />
          <span className="text-base font-bold uppercase tracking-widest">Happening Now</span>
        </div>
        <p className="max-w-md text-balance text-2xl font-bold leading-snug md:text-3xl">
          Rendezvous 2026 is <span className="text-primary">in full swing!</span>
        </p>
        <p className="max-w-sm text-balance text-muted-foreground">
          We&apos;re gathered at Lake Williamson, May 4–8, 2026. See you there!
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/schedule">View Schedule</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/map2026">Event Map</Link>
          </Button>
        </div>
      </div>
    )
  }

  // ----- POST-EVENT STATE -----
  if (phase === "post-event") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2 rounded-full bg-muted px-5 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          <Clock className="h-4 w-4" />
          Event Complete
        </div>
        <p className="text-2xl font-bold">What an incredible Rendezvous!</p>
        <p className="max-w-sm text-balance text-muted-foreground">
          Thank you for joining us. Stay tuned for announcements about Rendezvous 2027.
        </p>
      </div>
    )
  }

  // ----- REGISTRATION OPEN -----
  if (phase === "registration-open") {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-5 py-2 text-sm font-semibold text-primary uppercase tracking-widest">
          <Clock className="h-4 w-4" />
          Registration closes in
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <CountdownUnit value={timeLeft.days} label="Days" />
          <CountdownUnit value={timeLeft.hours} label="Hours" />
          <CountdownUnit value={timeLeft.minutes} label="Minutes" />
          <CountdownUnit value={timeLeft.seconds} label="Seconds" />
        </div>
        <p className="text-sm text-muted-foreground">Deadline: April 15, 2026 at 11:59 PM Central Time</p>
        <Button size="lg" asChild>
          <Link href="/registration">
            Register Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    )
  }

  // ----- REGISTRATION CLOSED — countdown to event -----
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Status pill */}
      <div className="flex items-center gap-2 rounded-full bg-amber-500/15 px-5 py-2 text-sm font-semibold text-amber-700 uppercase tracking-widest dark:text-amber-400">
        <CalendarX className="h-4 w-4" />
        Registration Closed
      </div>

      {/* Label */}
      <p className="text-lg font-semibold text-muted-foreground">Event starts in</p>

      {/* Countdown tiles */}
      <div className="flex flex-wrap justify-center gap-4">
        <CountdownUnit value={timeLeft.days} label="Days" />
        <CountdownUnit value={timeLeft.hours} label="Hours" />
        <CountdownUnit value={timeLeft.minutes} label="Minutes" />
        <CountdownUnit value={timeLeft.seconds} label="Seconds" />
      </div>

      {/* Date + location */}
      <div className="flex flex-col items-center gap-1.5 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">May 4–8, 2026</span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          Lake Williamson Christian Center, Carlinville, IL
        </span>
      </div>

      {/* Secondary CTAs */}
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="lg" variant="outline" asChild>
          <Link href="/schedule">View Schedule</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/about">About the Event</Link>
        </Button>
      </div>
    </div>
  )
}
