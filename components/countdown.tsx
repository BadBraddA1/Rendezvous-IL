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
      // May 3, 2027 at 1:00 PM Central Time (CDT is UTC-5)
      const targetDate = Date.UTC(2027, 4, 3, 18, 0, 0) // UTC time for 1:00 PM CDT
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
          <h3 className="text-2xl font-bold text-primary">Event Starts In</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {["Days", "Hours", "Minutes", "Seconds"].map((label) => (
            <Card key={label} className="border-border/50 bg-card">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="text-3xl sm:text-4xl font-bold text-foreground mb-2">--</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 text-center">
          <p className="text-muted-foreground">May 3, 2027 at 1:00 PM Central Time</p>
        </div>
      </div>
    )
  }

  // Event has started - show celebration message
  if (eventStarted) {
    return (
      <div className="w-full">
        <Card className="border-primary/30 bg-card overflow-hidden">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="flex justify-center mb-4">
              <PartyPopper className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Rendezvous 2027 is Happening!
            </h3>
            <p className="text-lg text-muted-foreground">
              Welcome to Lake Williamson Christian Center
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              May 3-7, 2027
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-4 text-center">
        <h3 className="text-2xl font-bold text-primary">Event Starts In</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[
          { label: "Days", value: timeLeft.days },
          { label: "Hours", value: timeLeft.hours },
          { label: "Minutes", value: timeLeft.minutes },
          { label: "Seconds", value: timeLeft.seconds },
        ].map((item) => (
          <Card key={item.label} className="border-border/50 bg-card">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                {String(item.value).padStart(2, "0")}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-4 text-center">
        <p className="text-muted-foreground">May 3, 2027 at 1:00 PM Central Time</p>
      </div>
    </div>
  )
}
