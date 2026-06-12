"use client"

import { useEffect, useState, type CSSProperties } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const taglines = [
  "Fellowship. Faith. Family.",
  "Where Homeschool Families Connect",
  "5 Days of Unforgettable Memories",
  "Grow Together in Faith",
  "Building Lifelong Friendships",
]

export function HeroSection() {
  const [currentTagline, setCurrentTagline] = useState(0)
  const [taglineVisible, setTaglineVisible] = useState(true)
  const [motionReady, setMotionReady] = useState(false)

  useEffect(() => {
    setMotionReady(true)

    const interval = setInterval(() => {
      setTaglineVisible(false)
      setTimeout(() => {
        setCurrentTagline((prev) => (prev + 1) % taglines.length)
        setTaglineVisible(true)
      }, 280)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section
      className={`hero-lake-bg hero-viewport relative flex flex-col items-center justify-center pt-[calc(4.5rem+env(safe-area-inset-top,0px))] md:pt-24 ${motionReady ? "hero-motion-ready" : ""}`}
    >
      <div className="site-container relative z-10 text-center">
        <div className="hero-stagger mb-6" style={{ "--i": 0 } as CSSProperties}>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-6 py-2.5 text-sm font-medium text-foreground ring-1 ring-primary/10">
            <span className="relative flex h-2 w-2">
              <span className="hero-live-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            May 3–7, 2027
          </span>
        </div>

        <div className="hero-stagger mb-6" style={{ "--i": 1 } as CSSProperties}>
          <Image
            src="/rendezvous-logo.png"
            alt="Rendezvous - Christian Homeschool Family Retreat"
            width={600}
            height={200}
            className="mx-auto h-auto w-full max-w-[min(100%,420px)] md:max-w-[520px] lg:max-w-[600px]"
            priority
          />
        </div>

        <h1
          className="hero-stagger hero-year font-display mb-2 text-balance font-bold leading-none tracking-[-0.03em] text-primary"
          style={{ "--i": 2 } as CSSProperties}
        >
          2027
        </h1>

        <div className="hero-stagger mb-6" style={{ "--i": 3 } as CSSProperties}>
          <p className="text-lead font-medium text-brand-coral-ink">Theme: 1 Samuel</p>
          <p className="mt-1 text-sm text-muted-foreground">Next Bible Bowl study</p>
        </div>

        <div
          className="hero-stagger mb-6 flex h-16 items-center justify-center"
          style={{ "--i": 4 } as CSSProperties}
          aria-live="polite"
          aria-atomic="true"
        >
          <p
            className={`mx-auto max-w-xs px-2 text-base font-normal text-muted-foreground transition-opacity duration-300 ease-out sm:max-w-md sm:px-0 sm:text-lead md:max-w-lg md:text-xl ${
              taglineVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {taglines[currentTagline]}
          </p>
        </div>

        <p
          className="hero-stagger mb-10 text-base text-muted-foreground md:text-lg"
          style={{ "--i": 5 } as CSSProperties}
        >
          <span className="text-balance">Lake Williamson Christian Center, Carlinville, IL</span>
        </p>

        <div
          className="hero-stagger flex flex-col items-center justify-center gap-4 sm:flex-row"
          style={{ "--i": 6 } as CSSProperties}
        >
          <Button
            size="lg"
            className="h-14 w-full px-10 text-base font-medium transition-colors duration-200 ease-out sm:w-auto"
            asChild
          >
            <Link href="/about">
              Learn more
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 w-full border border-primary/25 px-10 text-base font-medium text-primary transition-colors duration-200 ease-out hover:bg-surface-highlight sm:w-auto"
            asChild
          >
            <Link href="/schedule">View schedule</Link>
          </Button>
        </div>

        <div className="h-10 md:h-16" aria-hidden="true" />
      </div>
    </section>
  )
}
