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
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-background via-secondary to-muted">
      <div className="relative z-10 container mx-auto px-6 text-center">
        {/* Date badge */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-2 text-sm font-medium text-foreground backdrop-blur-sm shadow-sm">
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

        {/* Giant 2027 Text with Teal-to-Coral Gradient */}
        <h1 
          className="mb-4 text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter text-foreground animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <span 
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(to right, #e07860, #e8927c, #c9b49c, #8dd4c4, #5ec8b4)"
            }}
          >
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
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm"
        aria-label="Scroll to content"
      >
        <span className="text-xs font-medium">Scroll</span>
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </button>
    </section>
  )
}
