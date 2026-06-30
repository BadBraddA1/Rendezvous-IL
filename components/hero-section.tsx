"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const taglines = [
  "Fellowship. Faith. Family.",
  "Where Homeschool Families Connect",
  "Building Lifelong Friendships",
]

export function HeroSection() {
  const [currentTagline, setCurrentTagline] = useState(0)
  const [taglineVisible, setTaglineVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineVisible(false)
      setTimeout(() => {
        setCurrentTagline((prev) => (prev + 1) % taglines.length)
        setTaglineVisible(true)
      }, 280)
    }, 8000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section
      className="hero-lake-bg hero-viewport relative flex min-h-[calc(100dvh-var(--site-header-offset))] flex-col items-center justify-start site-below-header-loose"
    >
      <div className="site-container site-page-intro relative z-10 flex min-h-0 flex-1 flex-col items-center justify-start py-8 text-center md:py-12">
        <div className="mb-6">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-card px-6 py-2.5 text-sm font-medium text-foreground">
            May 3–7, 2027
          </span>
        </div>

        <div className="mb-6">
          <Image
            src="/rendezvous-logo.png"
            alt="Rendezvous - Christian Homeschool Family Retreat"
            width={600}
            height={200}
            className="mx-auto h-auto w-full max-w-[min(100%,420px)] md:max-w-[520px] lg:max-w-[600px]"
            priority
          />
        </div>

        <h1 className="hero-year font-display mb-2 text-balance text-primary">
          <span className="sr-only">Rendezvous </span>2027
        </h1>

        <div className="mb-6">
          <p className="text-lead font-medium text-brand-coral-ink">Theme: 1 Samuel</p>
          <p className="mt-1 text-sm text-muted-foreground">2027 Bible Bowl study book</p>
        </div>

        <div className="mb-6 flex h-16 items-center justify-center" aria-live="polite" aria-atomic="true">
          <p
            className={`hero-tagline measure mx-auto max-w-md px-2 text-lead text-muted-foreground ${
              taglineVisible ? "hero-tagline--visible" : ""
            }`}
          >
            {taglines[currentTagline]}
          </p>
        </div>

        <p className="mb-10 text-base text-muted-foreground md:text-lg">
          <span className="text-balance">Lake Williamson Christian Center, Carlinville, IL</span>
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="h-14 w-full px-10 text-base font-medium sm:w-auto"
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
            className="h-14 w-full border border-primary/25 px-10 text-base font-medium text-primary hover:bg-surface-highlight sm:w-auto"
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
