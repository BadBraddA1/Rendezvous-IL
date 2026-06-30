"use client"

import Link from "next/link"
import { CalendarClock, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  RegistrationCountdownGrid,
  RegistrationNotifySection,
  useRegistrationOpenCountdown,
} from "@/components/registration-open-countdown"

export function RegistrationCountdown2027() {
  const { timeLeft, mounted, registrationOpen } = useRegistrationOpenCountdown()

  if (!mounted) {
    return (
      <section className="section border-y border-primary/15 bg-surface-highlight">
        <div className="site-container">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 text-primary">
              <CalendarClock className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-medium">Registration opens</span>
            </div>
            <h2 className="text-section-title mb-8">January 1, 2027</h2>
            <RegistrationCountdownGrid
              timeLeft={timeLeft}
              mounted={false}
              className="mx-auto mb-10 grid max-w-[18rem] grid-cols-4 gap-2 sm:max-w-none sm:flex sm:justify-center sm:gap-4 md:gap-6 lg:gap-8"
            />
          </div>
        </div>
      </section>
    )
  }

  if (registrationOpen) {
    return (
      <section className="section border-y border-primary/20 bg-surface-lake">
        <div className="site-container">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 text-primary">
              <Bell className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-medium">Registration is open</span>
            </div>
            <h2 className="text-section-title mb-4">Register for Rendezvous 2027</h2>
            <p className="mb-8 text-lg text-on-surface/85">Secure your spot for Rendezvous 2027 today.</p>
            <Button size="lg" className="h-14 w-full px-8 text-base font-semibold sm:w-auto" asChild>
              <Link href="/registration">Register now</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section border-y border-primary/15 bg-surface-highlight">
      <div className="site-container">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 text-primary">
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-medium">Registration opens</span>
          </div>
          <h2 className="text-section-title mb-2">January 1, 2027</h2>
          <p className="mb-10 text-muted-foreground">Mark your calendars and be ready to register.</p>

          <RegistrationCountdownGrid
            timeLeft={timeLeft}
            mounted={mounted}
            className="mx-auto mb-10 grid max-w-[18rem] grid-cols-4 gap-2 sm:max-w-none sm:flex sm:justify-center sm:gap-4 md:gap-6 lg:gap-8"
          />

          <RegistrationNotifySection />
        </div>
      </div>
    </section>
  )
}
