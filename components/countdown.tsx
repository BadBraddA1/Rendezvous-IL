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

export function Countdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)
  const [eventStarted, setEventStarted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const calculateTimeLeft = (): TimeLeft => {
      const targetDate = Date.UTC(2026, 4, 4, 18, 0, 0) // May 4, 2026 at 1:00 PM Central Time
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
          <h3 className="text-2xl font-bold text-ring">Event Starts In</h3>
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
          <p className="text-ring">May 4, 2026 at 1:00 PM Central Time</p>
        </div>
      </div>
    )
  }

  // Event has started - show celebration message
  if (eventStarted) {
    return (
      <div className="w-full">
        <Card className="border-secondary-foreground/20 bg-primary text-background overflow-hidden">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="flex justify-center mb-4">
              <PartyPopper className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-400" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-secondary-foreground mb-2">
              Rendezvous 2026 is Happening!
            </h3>
            <p className="text-lg text-secondary-foreground/80">
              Welcome to Lake Williamson Christian Center
            </p>
            <p className="mt-4 text-sm text-secondary-foreground/60">
              May 4-8, 2026
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-4 text-center">
        <h3 className="text-2xl font-bold text-ring">Event Starts In</h3>
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
        <p className="text-ring">May 4, 2026 at 1:00 PM Central Time</p>
      </div>
    </div>
  )
}
