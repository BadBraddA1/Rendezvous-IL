"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function RegistrationCountdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const calculateTimeLeft = (): TimeLeft => {
      // April 15, 2026 at 11:59 PM Central Time = April 16, 2026 at 4:59 AM UTC
      const targetDate = new Date(Date.UTC(2026, 3, 16, 4, 59, 0)).getTime()
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

  if (!mounted) {
    return (
      <div className="w-full">
        <div className="mb-4 text-center">
          <h3 className="text-2xl font-bold text-ring">Registration Closes In</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {["Days", "Hours", "Minutes", "Seconds"].map((label) => (
            <Card key={label} className="border-secondary-foreground/20 bg-primary text-background">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="text-3xl sm:text-4xl font-bold text-secondary-foreground mb-2">--</div>
                <div className="text-xs sm:text-sm text-secondary-foreground/70">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 text-center">
          <p className="text-ring">April 15, 2026 at 11:59 PM Central Time</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-4 text-center">
        <h3 className="text-2xl font-bold text-ring">Registration Closes In</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          { label: "Days", value: timeLeft.days },
          { label: "Hours", value: timeLeft.hours },
          { label: "Minutes", value: timeLeft.minutes },
          { label: "Seconds", value: timeLeft.seconds },
        ].map((item) => (
          <Card key={item.label} className="border-secondary-foreground/20 bg-primary text-background">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-3xl sm:text-4xl font-bold text-secondary-foreground mb-2">
                {String(item.value).padStart(2, "0")}
              </div>
              <div className="text-xs sm:text-sm text-secondary-foreground/70">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-4 text-center">
        <p className="text-ring">April 15, 2026 at 11:59 PM Central Time</p>
      </div>
    </div>
  )
}
