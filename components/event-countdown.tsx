"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarCheck, PartyPopper, Clock } from "lucide-react"

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

type EventStatus = "pre-event" | "in-progress" | "ended"

// Event dates: May 4-8, 2026
const EVENT_START = Date.UTC(2026, 4, 4, 12, 0, 0) // May 4, 2026 at noon UTC (7am Central)
const EVENT_END = Date.UTC(2026, 4, 8, 18, 0, 0) // May 8, 2026 at 6pm UTC (1pm Central)

function getEventStatus(): EventStatus {
  const now = Date.now()
  if (now < EVENT_START) return "pre-event"
  if (now >= EVENT_START && now < EVENT_END) return "in-progress"
  return "ended"
}

function calculateTimeLeft(): TimeLeft {
  const now = Date.now()
  const difference = EVENT_START - now

  if (difference > 0) {
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    }
  }

  return { days: 0, hours: 0, minutes: 0, seconds: 0 }
}

export function EventCountdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [eventStatus, setEventStatus] = useState<EventStatus>("pre-event")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setEventStatus(getEventStatus())
    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      setEventStatus(getEventStatus())
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Loading state
  if (!mounted) {
    return (
      <div className="w-full">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Loading...</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {["Days", "Hours", "Minutes", "Seconds"].map((label) => (
            <Card key={label} className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="text-3xl sm:text-5xl font-bold text-primary mb-2">--</div>
                <div className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Event in progress display
  if (eventStatus === "in-progress") {
    return (
      <div className="w-full">
        <Card className="overflow-hidden border-2 border-chart-3 bg-gradient-to-br from-chart-3/10 via-accent/5 to-chart-3/10">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="mb-6 inline-flex items-center justify-center rounded-full bg-chart-3/20 p-4">
              <PartyPopper className="h-12 w-12 text-chart-3" />
            </div>
            <h3 className="mb-4 text-3xl sm:text-4xl font-bold text-foreground">
              Rendezvous is Happening Now!
            </h3>
            <p className="mb-6 text-lg text-muted-foreground max-w-md mx-auto">
              Welcome to all our families joining us at Lake Williamson Christian Center. 
              We hope you have an amazing time of fellowship, worship, and fun!
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-chart-3/20 px-6 py-3 text-chart-3 font-semibold animate-pulse">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-chart-3 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-chart-3"></span>
              </span>
              Event In Progress
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Event has ended
  if (eventStatus === "ended") {
    return (
      <div className="w-full">
        <Card className="overflow-hidden border-border/50 bg-muted/50">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="mb-6 inline-flex items-center justify-center rounded-full bg-primary/10 p-4">
              <CalendarCheck className="h-12 w-12 text-primary" />
            </div>
            <h3 className="mb-4 text-3xl sm:text-4xl font-bold text-foreground">
              Thank You for Joining Us!
            </h3>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Rendezvous 2026 has concluded. Thank you to all the families who attended. 
              We hope to see you again next year!
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Pre-event countdown
  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">Registration Closed</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-foreground">Rendezvous Begins In</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          { label: "Days", value: timeLeft.days },
          { label: "Hours", value: timeLeft.hours },
          { label: "Minutes", value: timeLeft.minutes },
          { label: "Seconds", value: timeLeft.seconds },
        ].map((item) => (
          <Card key={item.label} className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 transition-transform hover:scale-105">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-3xl sm:text-5xl font-bold text-primary mb-2 tabular-nums">
                {String(item.value).padStart(2, "0")}
              </div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 text-center">
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">May 4-8, 2026</span>
          <span className="mx-2">|</span>
          Lake Williamson Christian Center
        </p>
      </div>
    </div>
  )
}
