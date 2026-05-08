"use client"

import { useEffect, useState } from "react"
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
  const [isVisible, setIsVisible] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Trigger mount animation
    setMounted(true)
    
    const interval = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentTagline((prev) => (prev + 1) % taglines.length)
        setIsVisible(true)
      }, 500)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-background via-secondary to-muted pt-20 md:pt-24">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 container mx-auto px-6 text-center">
        {/* Date badge - slides up with spring */}
        <div 
          className={`mb-6 ${mounted ? 'animate-slide-up-spring' : 'opacity-0'}`}
          style={{ animationDelay: "0.1s" }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-sm px-6 py-2.5 text-sm font-medium text-foreground shadow-lg shadow-black/5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            May 3-7, 2027
          </span>
        </div>

        {/* Main Logo - Scale blur entrance */}
        <div 
          className={`mb-6 ${mounted ? 'animate-scale-blur-in' : 'opacity-0'}`}
          style={{ animationDelay: "0.3s" }}
        >
          <Image
            src="/rendezvous-logo.png"
            alt="Rendezvous - Christian Homeschool Family Retreat"
            width={600}
            height={200}
            className="mx-auto h-auto w-full max-w-[420px] md:max-w-[520px] lg:max-w-[600px] drop-shadow-2xl"
            priority
          />
        </div>

        {/* Giant 2027 Text - Dramatic scale entrance with animated gradient */}
        <h1 
          className={`mb-2 text-8xl md:text-9xl lg:text-[12rem] font-black tracking-tighter leading-none ${mounted ? 'animate-hero-number' : 'opacity-0'}`}
          style={{ animationDelay: "0.5s" }}
        >
          <span 
            className="bg-clip-text text-transparent animate-gradient-x drop-shadow-sm"
            style={{
              backgroundImage: "linear-gradient(90deg, #e07860, #e8927c, #c9b49c, #8dd4c4, #5ec8b4, #8dd4c4, #c9b49c, #e8927c, #e07860)",
              backgroundSize: "200% auto"
            }}
          >
            2027
          </span>
        </h1>

        {/* Theme / Bible Bowl - Pop in */}
        <div 
          className={`mb-6 ${mounted ? 'animate-pop-in' : 'opacity-0'}`}
          style={{ animationDelay: "0.9s" }}
        >
          <p className="text-xl md:text-2xl font-semibold text-foreground">
            Theme: 1 Samuel
          </p>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Next Bible Bowl Study
          </p>
        </div>

        {/* Dynamic Tagline - Fade in */}
        <div 
          className={`h-16 mb-6 flex items-center justify-center ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}
          style={{ animationDelay: "1.1s" }}
        >
          <p 
            className={`text-xl md:text-2xl lg:text-3xl font-light text-muted-foreground transition-all duration-500 ${
              isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 -translate-y-4 blur-sm"
            }`}
          >
            {taglines[currentTagline]}
          </p>
        </div>

        {/* Location - Slide up */}
        <p 
          className={`mb-10 text-base md:text-lg text-muted-foreground ${mounted ? 'animate-slide-up-spring' : 'opacity-0'}`}
          style={{ animationDelay: "1.3s" }}
        >
          Lake Williamson Christian Center, Carlinville, IL
        </p>

        {/* CTA Buttons - Pop in with stagger */}
        <div 
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 ${mounted ? 'animate-pop-in' : 'opacity-0'}`}
          style={{ animationDelay: "1.5s" }}
        >
          <Button 
            size="lg" 
            className="h-14 px-10 text-base font-semibold w-full sm:w-auto shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 transition-all duration-300" 
            asChild
          >
            <Link href="/about">
              Learn More
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="h-14 px-10 text-base font-semibold border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 w-full sm:w-auto hover:scale-105 transition-all duration-300"
            asChild
          >
            <Link href="/schedule">View Schedule</Link>
          </Button>
        </div>

        {/* Spacer */}
        <div className="h-20" />
      </div>
    </section>
  )
}
