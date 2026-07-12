"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import dynamic from "next/dynamic"
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
  type LucideIcon,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { HeroSection } from "@/components/hero-section"
import { RegistrationCountdown2027 } from "@/components/registration-countdown-2027"
import { latestCompletedAttendance } from "@/lib/attendance-history"

const lastGathering = latestCompletedAttendance()

const MuxVideoPlayer = dynamic(
  () => import("@/components/mux-video-player").then((mod) => mod.MuxVideoPlayer),
  {
    ssr: false,
    loading: () => <div className="aspect-video w-full animate-pulse rounded-xl bg-muted" aria-hidden="true" />,
  },
)

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
          ? "border-primary/25 bg-surface-highlight"
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
  useEffect(() => {
    void import("@mux/mux-player-react")
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader isHomepage />

      <main id="main-content">
        <HeroSection />

        <RegistrationCountdown2027 />

        <section className="section-sm border-b border-border/50">
          <div className="site-container">
            <figure className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-primary/15 bg-card shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/rendezvous-group-2026.jpg"
                alt="Rendezvous 2026 group photo at Lake Williamson Christian Center"
                className="h-auto w-full"
              />
              <figcaption className="border-t border-border/60 px-4 py-3 text-center text-sm text-muted-foreground">
                <Link
                  href="/about"
                  className="font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                >
                  Rendezvous {lastGathering?.year ?? 2026}
                  {lastGathering ? <> · {lastGathering.attendees} people</> : null}
                  {" — "}
                  see you May 3–7, 2027
                </Link>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="section-lg">
          <div className="site-container">
            <div className="mx-auto max-w-5xl">
              <header className="mb-8 text-center sm:mb-12">
                <h2 className="text-section-title mb-4 text-balance">Experience Rendezvous</h2>
              </header>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <MuxVideoPlayer
                  playbackId="Fu2mzvA8FO6sEUE01JWv8DvLgRz7K01hmvyBH01DTiDKyc"
                  title="Rendezvous retreat video"
                  thumbnailWidth={1200}
                  thumbnailHeight={675}
                  playButtonSize="lg"
                />
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
                <h2 className="text-section-title text-balance">Planning for 2027</h2>
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
            <h2 className="text-section-title mb-6 text-balance text-on-surface">See you at Rendezvous 2027</h2>
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
