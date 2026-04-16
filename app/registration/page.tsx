"use client"

import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ArrowLeft, Clock } from "lucide-react"
import { Countdown } from "@/components/countdown"

export default function RegistrationPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Clock className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight md:text-5xl">
              Registration Closed
            </h1>
            <p className="text-balance text-lg text-muted-foreground">
              Registration for Rendezvous 2026 has closed as of April 15, 2026.
            </p>
          </div>

          {/* Info Card */}
          <Card className="mb-8">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>See You at the Event!</CardTitle>
              <CardDescription>
                If you have already registered, we look forward to seeing you at Rendezvous 2026.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="font-semibold">May 4-8, 2026</p>
                <p className="text-sm text-muted-foreground">Lake Williamson Christian Center, Carlinville, IL</p>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                For any questions or concerns about your registration, please contact us through the Facebook group or reach out to the event organizers directly.
              </p>
            </CardContent>
          </Card>

          {/* Countdown */}
          <div className="mb-8">
            <Countdown />
          </div>

          {/* Navigation */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <Button asChild>
              <Link href="/schedule">View Schedule</Link>
            </Button>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
