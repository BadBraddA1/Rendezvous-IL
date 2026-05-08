"use client"

import { useEffect, useState } from "react"
import { CalendarClock, Bell, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function RegistrationCountdown2027() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState("")

  useEffect(() => {
    setMounted(true)

    const calculateTimeLeft = (): TimeLeft => {
      // January 1, 2027 at 12:00 AM Central Time (CST is UTC-6)
      const targetDate = Date.UTC(2027, 0, 1, 6, 0, 0) // UTC time for midnight CST
      const now = Date.now()
      const difference = targetDate - now

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

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

      setSubmitMessage("✓ Thank you! We'll notify you when registration opens.")
      setEmail("")
      setTimeout(() => setSubmitMessage(""), 4000)
    } catch (error) {
      setSubmitMessage("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl bg-card border border-border/50 flex items-center justify-center shadow-lg shadow-primary/5">
          <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground font-mono">
            {String(value).padStart(2, "0")}
          </span>
        </div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent rounded-full" />
      </div>
      <span className="mt-3 text-xs sm:text-sm text-muted-foreground uppercase tracking-wider font-medium">
        {label}
      </span>
    </div>
  )

  if (!mounted) {
    return (
      <section className="py-20 border-y border-border/50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-6 text-primary">
              <CalendarClock className="h-6 w-6" />
              <span className="text-sm font-semibold uppercase tracking-wider">Registration Opens</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-foreground">January 1, 2027</h2>
            <div className="flex justify-center gap-4 sm:gap-6 md:gap-8">
              {["Days", "Hours", "Minutes", "Seconds"].map((label) => (
                <TimeBlock key={label} value={0} label={label} />
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (registrationOpen) {
    return (
      <section className="py-20 border-y border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-6 text-primary animate-pulse">
              <Bell className="h-6 w-6" />
              <span className="text-sm font-semibold uppercase tracking-wider">Now Open</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Registration is Open!
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Secure your spot for Rendezvous 2027 today.
            </p>
            <Button size="lg" className="h-14 px-8 text-base font-semibold">
              Register Now
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-20 border-y border-border/50">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 text-primary">
            <CalendarClock className="h-6 w-6" />
            <span className="text-sm font-semibold uppercase tracking-wider">Registration Opens</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">January 1, 2027</h2>
          <p className="text-muted-foreground mb-10">Mark your calendars and be ready to register!</p>
          
          <div className="flex justify-center gap-3 sm:gap-4 md:gap-6 lg:gap-8 mb-10">
            <TimeBlock value={timeLeft.days} label="Days" />
            <TimeBlock value={timeLeft.hours} label="Hours" />
            <TimeBlock value={timeLeft.minutes} label="Minutes" />
            <TimeBlock value={timeLeft.seconds} label="Seconds" />
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Get notified when registration opens by joining our{" "}
              <a 
                href="https://www.facebook.com/groups/RendezvousIL" 
                target="_blank" 
                rel="noreferrer noopener"
                className="text-primary hover:underline font-medium"
              >
                Facebook Group
              </a>
            </p>

            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="flex-1"
              />
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Mail className="h-4 w-4" />
                {isSubmitting ? "Subscribing..." : "Notify Me"}
              </Button>
            </form>

            {submitMessage && (
              <p className={`text-sm ${submitMessage.includes("✓") ? "text-green-600" : "text-amber-600"}`}>
                {submitMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
