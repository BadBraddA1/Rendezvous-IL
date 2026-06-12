"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  MapPin,
  Users,
  Sparkles,
  ExternalLink,
  Wifi,
  Trophy,
  Play,
  ArrowRight,
  type LucideIcon,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { HeroSection } from "@/components/hero-section"
import { RegistrationCountdown2027 } from "@/components/registration-countdown-2027"

const retreatFacts = [
  {
    icon: Calendar,
    title: "5 days / 4 nights",
    description: "Lots of time for fellowship, worship, recreation, and encouragement.",
  },
  {
    icon: MapPin,
    title: "Lake Williamson",
    description: "A full-service Christian camp with lodging, dining, and recreation on site.",
  },
  {
    icon: Users,
    title: "All ages welcome",
    description: "Activities for children through adults, planned as a family retreat.",
  },
  {
    icon: Sparkles,
    title: "Meals included",
    description: "Buffet-style dining with no cooking or cleanup for your family.",
  },
] as const

const planning2027 = [
  { label: "Dates", value: "May 3–7, 2027 (Monday – Friday)" },
  { label: "Registration opens", value: "January 1, 2027" },
  { label: "Theme / Bible Bowl", value: "1 Samuel" },
  { label: "Location", value: "Lake Williamson Christian Center, Carlinville, IL" },
] as const

function ExpectPanel({
  icon: Icon,
  title,
  children,
  featured = false,
  className = "",
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
  featured?: boolean
  className?: string
}) {
  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border p-5 sm:p-6 ${
        featured
          ? "border-primary/30 bg-surface-highlight ring-1 ring-primary/10"
          : "border-border/70 bg-card"
      } ${className}`}
    >
      <h3 className="flex items-center gap-2.5 font-medium text-foreground">
        <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-muted-foreground sm:text-base">{children}</div>
    </article>
  )
}

export default function HomePage() {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader isHomepage />

      <main id="main-content">
        <HeroSection />

        <RegistrationCountdown2027 />

        <section className="section-lg">
          <div className="site-container">
            <div className="mx-auto max-w-5xl">
              <header className="mb-8 text-center sm:mb-12">
                <h2 className="text-section-title mb-4 text-balance">Experience Rendezvous</h2>
                <p className="measure-prose mx-auto text-lead text-muted-foreground">
                  See what makes our Christian homeschool family retreat so special
                </p>
              </header>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="relative aspect-video w-full">
                  {isPlaying ? (
                    <iframe
                      src="https://player.mux.com/Fu2mzvA8FO6sEUE01JWv8DvLgRz7K01hmvyBH01DTiDKyc?autoplay=1&muted=0"
                      className="absolute inset-0 h-full w-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsPlaying(true)}
                      className="focus-ring group absolute inset-0 flex items-center justify-center"
                      aria-label="Play Rendezvous retreat video"
                    >
                      <img
                        src="https://image.mux.com/Fu2mzvA8FO6sEUE01JWv8DvLgRz7K01hmvyBH01DTiDKyc/thumbnail.jpg?width=1200&height=675&fit_mode=smartcrop"
                        alt="Rendezvous retreat preview"
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-foreground/25 transition-colors group-hover:bg-foreground/35">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform duration-200 ease-out group-hover:scale-[1.03] md:h-20 md:w-20">
                          <Play className="ml-0.5 h-7 w-7 md:h-8 md:w-8" fill="currentColor" />
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-sm border-y border-border/50">
          <div className="site-container">
            <dl className="mx-auto grid max-w-5xl divide-y divide-primary/10 rounded-xl border border-primary/15 bg-surface-tint lg:grid-cols-4 lg:divide-x lg:divide-y-0">
              {retreatFacts.map(({ icon: Icon, title, description }) => (
                <div key={title} className="p-5 sm:p-6">
                  <dt className="flex items-start gap-2.5 font-medium text-foreground">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    {title}
                  </dt>
                  <dd className="mt-2 pl-7 text-sm leading-relaxed text-muted-foreground">{description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="section-lg">
          <div className="site-container max-w-3xl">
            <div className="text-center">
              <p className="mb-3 text-sm text-muted-foreground">Christian homeschool family retreat</p>
              <h2 className="text-section-title mb-5 text-balance sm:mb-6">Join us for fellowship and fun</h2>
              <p className="measure-prose mx-auto mb-8 text-lead text-muted-foreground">
                Rendezvous is a 5-day, 4-night retreat filled with fellowship, worship, recreation, and encouragement
                for Christian families who educate their children at home.
              </p>
              <Button size="lg" className="h-14 w-full px-8 text-base sm:w-auto" asChild>
                <Link href="/about">
                  Learn more about Rendezvous
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="section bg-surface-tint">
          <div className="site-container">
            <header className="mb-8 text-center sm:mb-12">
              <h2 className="text-section-title text-balance">What to expect</h2>
            </header>

            <div className="mx-auto flex max-w-6xl flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-8">
              <div className="flex flex-col gap-5 lg:w-[38%] lg:shrink-0">
                <ExpectPanel icon={Trophy} title="Bible Bowl" featured className="flex-1 lg:p-7">
                  <p>
                    Everyone is encouraged to participate in the Bible Bowl on Thursday morning (children and adults).
                    This is a great study opportunity for families.
                  </p>
                  <a
                    href="https://pewpackers.com/"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-4 inline-flex items-center gap-2 font-medium text-primary transition-colors hover:underline"
                  >
                    Learn about Bible Bowl
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </ExpectPanel>
                <ExpectPanel icon={Wifi} title="Event WiFi">
                  <dl className="space-y-1 font-mono text-sm tabular-nums">
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-medium text-foreground">Network:</dt>
                      <dd>LWCC</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-medium text-foreground">Password:</dt>
                      <dd>wifi4lwcc</dd>
                    </div>
                  </dl>
                </ExpectPanel>
              </div>
              <div className="grid flex-1 gap-5 sm:grid-cols-2">
                <ExpectPanel icon={Users} title="Lodging options">
                  <p>
                    Motel rooms (sleeps up to 6), RV sites, or tent camping. Motel rooms include linens and private
                    bathrooms.
                  </p>
                </ExpectPanel>
                <ExpectPanel icon={Sparkles} title="Recreation activities">
                  <p>
                    Archery, swimming, black-light dodgeball, nine square, basketball, volleyball, ping pong, mini golf,
                    canoeing, tournaments, and more.
                  </p>
                </ExpectPanel>
                <ExpectPanel icon={Calendar} title="Buffet dining" className="sm:col-span-2">
                  <p>
                    11 buffet meals plus a cookout by the lake. LWCC handles cooking and cleanup. Gluten-free foods are
                    labeled.
                  </p>
                </ExpectPanel>
              </div>
            </div>
          </div>
        </section>

        <section className="section border-t border-border/50">
          <div className="site-container">
            <div className="mx-auto max-w-3xl">
              <header className="mb-8 text-center sm:mb-10">
                <h2 className="text-section-title mb-4 text-balance">Planning for 2027</h2>
                <p className="text-lead text-muted-foreground">What we&apos;re preparing for the next Rendezvous</p>
              </header>
              <div className="planning-2027-hero">
                <p className="text-sm font-medium text-muted-foreground">Retreat dates</p>
                <p className="planning-2027-hero-value mt-1">May 3–7, 2027</p>
                <p className="mt-1 text-sm text-muted-foreground">Monday – Friday · Lake Williamson</p>
              </div>
              <div className="planning-2027-row">
                {planning2027.slice(1).map((item) => (
                  <div key={item.label} className="planning-2027-chip">
                    <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                    <span className="mt-1 text-sm font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section-lg border-t border-primary/15 bg-surface-lake">
          <div className="site-container text-center">
            <h2 className="text-section-title mb-4 text-balance">See you at Rendezvous 2027</h2>
            <p className="measure-prose mx-auto mb-8 text-balance text-lead text-on-surface">
              Get ready for fellowship, faith, and fun with homeschool families from across the country.
            </p>
            <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Button size="lg" className="h-14 px-8 text-base" asChild>
                <Link href="/schedule">View schedule</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-14 border-primary/30 bg-card/60 px-8 text-base hover:bg-card"
              >
                <a href="https://www.facebook.com/groups/RendezvousIL" target="_blank" rel="noreferrer noopener">
                  Join Facebook group
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
