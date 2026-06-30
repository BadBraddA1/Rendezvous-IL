"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function ClosingDigitCell({ value, label }: { value: string; label: string }) {
  return (
    <Card className="countdown-digit-cell border-0 shadow-none">
      <CardContent className="p-4 sm:p-6 text-center">
        <div className="registration-countdown-num mb-2">{value}</div>
        <div className="registration-countdown-label text-xs text-muted-foreground sm:text-sm">{label}</div>
      </CardContent>
    </Card>
  )
}

export function RegistrationCountdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const calculateTimeLeft = (): TimeLeft => {
      const targetDate = new Date(Date.UTC(2027, 3, 16, 4, 59, 0)).getTime()
      const now = Date.now()
      const difference = targetDate - now

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

    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const digits = mounted
    ? [
        { label: "Days", value: timeLeft.days },
        { label: "Hours", value: timeLeft.hours },
        { label: "Minutes", value: timeLeft.minutes },
        { label: "Seconds", value: timeLeft.seconds },
      ]
    : [
        { label: "Days", value: "--" },
        { label: "Hours", value: "--" },
        { label: "Minutes", value: "--" },
        { label: "Seconds", value: "--" },
      ]

  return (
    <div className="w-full rounded-xl border border-warning/25 bg-surface-warm p-4 sm:p-6">
      <div className="mb-4 text-center">
        <h3 className="text-section-title text-balance text-warning">Registration Closes In</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {digits.map((item) => (
          <ClosingDigitCell
            key={item.label}
            value={typeof item.value === "number" ? String(item.value).padStart(2, "0") : item.value}
            label={item.label}
          />
        ))}
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">April 15, 2027 at 11:59 PM Central Time</p>
      </div>
    </div>
  )
}
