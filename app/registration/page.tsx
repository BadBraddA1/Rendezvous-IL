"use client"

import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ArrowLeft, CalendarClock, Bell } from "lucide-react"
import {
  RegistrationCountdownGrid,
  RegistrationNotifySection,
  RegistrationOpenCta,
  useRegistrationOpenCountdown,
} from "@/components/registration-open-countdown"

export default function RegistrationPage() {
  const { timeLeft, mounted, registrationOpen } = useRegistrationOpenCountdown()

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main
        id="main-content"
        className="site-container site-below-header-loose site-page-intro pb-16 md:pb-20"
      >
        <div className="mx-auto max-w-2xl">
          <header className="mb-8 text-center md:mb-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface-highlight">
              {registrationOpen && mounted ? (
                <Bell className="h-8 w-8 text-primary" aria-hidden="true" />
              ) : (
                <CalendarClock className="h-8 w-8 text-primary" aria-hidden="true" />
              )}
            </div>
            <h1 className="text-page-title mb-3 text-balance">
              {registrationOpen && mounted ? "Registration is open" : "Registration opens soon"}
            </h1>
            <p className="text-lead text-muted-foreground">
              {registrationOpen && mounted
                ? "Rendezvous 2027 · May 3–7 · Lake Williamson Christian Center"
                : "Registration for Rendezvous 2027 opens January 1, 2027."}
            </p>
          </header>

          <Card className="mb-8 border-primary/15">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-highlight">
                <Calendar className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <CardTitle className="font-display">Mark your calendars</CardTitle>
              <CardDescription>Rendezvous 2027 · Theme: 1 Samuel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-surface-tint/50 p-4 text-center">
                <p className="font-semibold">May 3–7, 2027</p>
                <p className="text-sm text-muted-foreground">
                  Lake Williamson Christian Center, Carlinville, IL
                </p>
              </div>
              <p className="text-center text-sm leading-relaxed text-muted-foreground">
                Join our{" "}
                <a
                  href="https://www.facebook.com/groups/RendezvousIL"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="focus-ring rounded-sm font-medium text-primary hover:underline"
                >
                  Facebook group
                </a>{" "}
                for updates, or use the{" "}
                <Link href="/calculator" className="focus-ring rounded-sm font-medium text-primary hover:underline">
                  cost calculator
                </Link>{" "}
                to plan ahead.
              </p>
            </CardContent>
          </Card>

          {registrationOpen && mounted ? (
            <div className="mb-8">
              <RegistrationOpenCta />
            </div>
          ) : (
            <div className="mb-8 space-y-8">
              <div className="text-center">
                <h2 className="text-section-title mb-2">January 1, 2027</h2>
                <p className="mb-8 text-sm text-muted-foreground">Central Time · midnight</p>
                <RegistrationCountdownGrid
                  timeLeft={timeLeft}
                  mounted={mounted}
                  className="mx-auto grid max-w-[18rem] grid-cols-4 gap-2 sm:max-w-none sm:flex sm:justify-center sm:gap-4 md:gap-6"
                />
              </div>
              <RegistrationNotifySection />
            </div>
          )}

          <nav
            aria-label="Registration page actions"
            className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center"
          >
            <Button variant="outline" asChild className="h-11 gap-2 border-primary/25">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to home
              </Link>
            </Button>
            <Button asChild className="h-11">
              <Link href="/schedule">View schedule</Link>
            </Button>
            <Button variant="outline" asChild className="h-11 border-primary/25">
              <Link href="/faq">Read FAQ</Link>
            </Button>
          </nav>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
