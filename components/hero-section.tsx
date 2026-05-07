"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, ChevronDown } from "lucide-react"

const taglines = [
  "Fellowship. Faith. Family.",
  "Where Homeschool Families Connect",
  "5 Days of Unforgettable Memories",
  "Grow Together in Faith",
  "Building Lifelong Friendships",
  "Theme: 1 Samuel 1 - Hannah's Prayer",
]

export function HeroSection() {
  const [currentTagline, setCurrentTagline] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentTagline((prev) => (prev + 1) % taglines.length)
        setIsVisible(true)
      }, 500)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: "smooth",
    })
  }

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary animate-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>

      <div className="relative z-10 container mx-auto px-6 text-center">
        {/* Date badge */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-sm font-medium text-primary backdrop-blur-sm">
            May 3-7, 2027
          </span>
        </div>

        {/* Main Logo - Large and Prominent */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <Image
            src="/rendezvous-logo.png"
            alt="Rendezvous - Christian Homeschool Family Retreat"
            width={600}
            height={200}
            className="mx-auto h-auto w-full max-w-[500px] md:max-w-[600px] lg:max-w-[700px] animate-glow"
            priority
          />
        </div>

        {/* Giant RENDEZVOUS Text */}
        <h1 
          className="mb-4 text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter text-foreground animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            2027
          </span>
        </h1>

        {/* Dynamic Tagline */}
        <div className="h-16 mb-8 flex items-center justify-center animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          <p 
            className={`text-2xl md:text-3xl lg:text-4xl font-light text-muted-foreground transition-all duration-500 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
            }`}
          >
            {taglines[currentTagline]}
          </p>
        </div>

        {/* Location */}
        <p className="mb-12 text-lg text-muted-foreground animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
          Lake Williamson Christian Center, Carlinville, IL
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
          <Button size="lg" className="h-14 px-8 text-base font-semibold w-full sm:w-auto" asChild>
            <Link href="/about">
              Learn More
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="h-14 px-8 text-base font-semibold border-primary/30 hover:bg-primary/10 w-full sm:w-auto"
            asChild
          >
            <Link href="/schedule">View Schedule</Link>
          </Button>
        </div>

        {/* Spacer to ensure content doesn't overlap with scroll indicator */}
        <div className="h-24" />
      </div>

      {/* Scroll indicator - positioned at very bottom with proper z-index */}
      <button 
        onClick={scrollToContent}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer bg-background/50 backdrop-blur-sm px-4 py-2 rounded-full"
        aria-label="Scroll to content"
      >
        <span className="text-xs font-medium">Scroll</span>
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </button>
    </section>
  )
}
