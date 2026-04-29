"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { Menu, Sun, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { WeatherAssistant } from "@/components/weather-assistant"

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [showRay, setShowRay] = useState(false)
  const [showRayTooltip, setShowRayTooltip] = useState(false)

  // Show tooltip once for new visitors
  useEffect(() => {
    const hasSeenTooltip = localStorage.getItem('rayTooltipSeen')
    if (!hasSeenTooltip) {
      // Show after a short delay so it's not jarring
      const timer = setTimeout(() => setShowRayTooltip(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismissTooltip = () => {
    setShowRayTooltip(false)
    localStorage.setItem('rayTooltipSeen', 'true')
  }

  const handleAskRay = () => {
    dismissTooltip()
    setShowRay(true)
  }

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
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-primary/30 hover:bg-primary/10"
              onClick={handleAskRay}
            >
              <Sun className="h-4 w-4 text-yellow-500" />
              Ask Ray
            </Button>
            
            {/* One-time tooltip for new visitors */}
            {showRayTooltip && (
              <div className="absolute top-full right-0 mt-2 w-64 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="relative bg-primary text-primary-foreground rounded-lg shadow-lg p-4">
                  {/* Arrow pointing up */}
                  <div className="absolute -top-2 right-6 w-4 h-4 bg-primary rotate-45" />
                  <button 
                    onClick={dismissTooltip}
                    className="absolute top-2 right-2 text-primary-foreground/70 hover:text-primary-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-yellow-400 rounded-full p-1.5">
                      <Sun className="h-5 w-5 text-yellow-900" />
                    </div>
                    <span className="font-bold">Meet Ray!</span>
                  </div>
                  <p className="text-sm text-primary-foreground/90">
                    Rendezvous Weather AI - Get fun weather updates and see if outdoor activities will be a go!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <WeatherAssistant open={showRay} onOpenChange={setShowRay} />

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
              <Button
                variant="outline"
                size="lg"
                className="gap-2 border-primary/30 hover:bg-primary/10"
                onClick={() => {
                  setOpen(false)
                  handleAskRay()
                }}
              >
                <Sun className="h-5 w-5 text-yellow-500" />
                Ask Ray
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  )
}
