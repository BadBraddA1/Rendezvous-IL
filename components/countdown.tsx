"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { PartyPopper } from "lucide-react"

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function CountdownDigitCell({ value, label }: { value: string; label: string }) {
  return (
    <Card className="countdown-digit-cell border-0 shadow-none">
      <CardContent className="p-4 sm:p-6 text-center">
        <div className="registration-countdown-num mb-2">{value}</div>
        <div className="registration-countdown-label text-xs text-muted-foreground sm:text-sm">{label}</div>
      </CardContent>
    </Card>
  )
}

export function Countdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)
  const [eventStarted, setEventStarted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const calculateTimeLeft = (): TimeLeft => {
      const targetDate = Date.UTC(2027, 4, 3, 18, 0, 0)
      const now = Date.now()
      const difference = targetDate - now

      if (difference > 0) {
        setEventStarted(false)
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        }
      }

      setEventStarted(true)
      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }

    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full">
        <div className="mb-4 text-center">
          <h3 className="text-section-title text-primary text-balance">Event Starts In</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {["Days", "Hours", "Minutes", "Seconds"].map((label) => (
            <CountdownDigitCell key={label} value="--" label={label} />
          ))}
        </div>
        <div className="mt-4 text-center">
          <p className="text-muted-foreground">May 3, 2027 at 1:00 PM Central Time</p>
        </div>
      </div>
    )
  }

  if (eventStarted) {
    return (
      <div className="w-full">
        <Card className="overflow-hidden border-primary/25 bg-surface-lake">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 sm:h-20 sm:w-20">
                <PartyPopper className="h-10 w-10 text-primary sm:h-12 sm:w-12" aria-hidden="true" />
              </div>
            </div>
            <h3 className="text-section-title mb-2 text-balance text-on-surface">Rendezvous 2027 is Happening!</h3>
            <p className="text-lead text-on-surface/85">Welcome to Lake Williamson Christian Center</p>
            <p className="mt-4 text-sm text-on-surface/70">May 3-7, 2027</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-4 text-center">
        <h3 className="text-section-title text-primary text-balance">Event Starts In</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          { label: "Days", value: timeLeft.days },
          { label: "Hours", value: timeLeft.hours },
          { label: "Minutes", value: timeLeft.minutes },
          { label: "Seconds", value: timeLeft.seconds },
        ].map((item) => (
          <CountdownDigitCell
            key={item.label}
            value={String(item.value).padStart(2, "0")}
            label={item.label}
          />
        ))}
      </div>
      <div className="mt-4 text-center">
        <p className="text-muted-foreground">May 3, 2027 at 1:00 PM Central Time</p>
      </div>
    </div>
  )
}
