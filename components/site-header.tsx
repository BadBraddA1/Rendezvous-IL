"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { Menu, CalendarX, Radio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"

// Registration is closed — only event start/end matter now.
const EVENT_START = Date.UTC(2026, 4, 4, 18, 0, 0) // May 4, 2026 1:00 PM CT
const EVENT_END = Date.UTC(2026, 4, 8, 17, 0, 0)   // May 8, 2026 12:00 PM CT

type HeaderPhase = "closed" | "live" | "done"

function getHeaderPhase(now: number): HeaderPhase {
  if (now < EVENT_START) return "closed"
  if (now < EVENT_END) return "live"
  return "done"
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<HeaderPhase>("closed")

  useEffect(() => {
    setPhase(getHeaderPhase(Date.now()))
    const t = setInterval(() => setPhase(getHeaderPhase(Date.now())), 30_000)
    return () => clearInterval(t)
  }, [])

  const headerCta =
    phase === "live" ? (
      <Badge className="ml-4 flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white">
        <Radio className="h-3 w-3 animate-pulse" />
        Live Now
      </Badge>
    ) : (
      <Badge
        variant="outline"
        className="ml-4 flex items-center gap-1.5 rounded-full border-amber-400 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400"
      >
        <CalendarX className="h-3 w-3" />
        Reg. Closed
      </Badge>
    )

  const mobileCta =
    phase === "live" ? (
      <Button
        size="lg"
        className="mt-8 w-full max-w-[250px] bg-green-500 hover:bg-green-600"
        asChild
        onClick={() => setOpen(false)}
      >
        <Link href="/schedule">View Schedule</Link>
      </Button>
    ) : (
      <Button
        size="lg"
        variant="outline"
        className="mt-8 w-full max-w-[250px]"
        asChild
        onClick={() => setOpen(false)}
      >
        <Link href="/schedule">View Schedule</Link>
      </Button>
    )

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <nav className="container mx-auto flex h-20 items-center justify-between px-6">
        <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
          <Image
            src="/rendezvous-logo.png"
            alt="Rendezvous Homeschool Family Retreat"
            width={180}
            height={60}
            className="h-14 w-auto"
            priority
          />
        </Link>

        <div className="ml-auto hidden items-center gap-8 md:flex">
          <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
            Home
          </Link>
          <Link href="/schedule" className="text-sm font-medium transition-colors hover:text-primary">
            Schedule
          </Link>
          <Link href="/about" className="text-sm font-medium transition-colors hover:text-primary">
            About
          </Link>
          <Link href="/biblebowl" className="text-sm font-medium transition-colors hover:text-primary">
            Bible Bowl
          </Link>
          <Link href="/faq" className="text-sm font-medium transition-colors hover:text-primary">
            FAQ
          </Link>
          <Link href="/calculator" className="text-sm font-medium transition-colors hover:text-primary">
            Calculator
          </Link>
          {headerCta}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <nav className="flex flex-col items-center gap-8 pt-16">
              <Link
                href="/"
                className="text-xl font-medium text-center transition-colors hover:text-primary"
                onClick={() => setOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/schedule"
                className="text-xl font-medium text-center transition-colors hover:text-primary"
                onClick={() => setOpen(false)}
              >
                Schedule
              </Link>
              <Link
                href="/about"
                className="text-xl font-medium text-center transition-colors hover:text-primary"
                onClick={() => setOpen(false)}
              >
                About
              </Link>
              <Link
                href="/biblebowl"
                className="text-xl font-medium text-center transition-colors hover:text-primary"
                onClick={() => setOpen(false)}
              >
                Bible Bowl
              </Link>
              <Link
                href="/faq"
                className="text-xl font-medium text-center transition-colors hover:text-primary"
                onClick={() => setOpen(false)}
              >
                FAQ
              </Link>
              <Link
                href="/calculator"
                className="text-xl font-medium text-center transition-colors hover:text-primary"
                onClick={() => setOpen(false)}
              >
                Calculator
              </Link>
              {mobileCta}
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  )
}
