"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, MapPin, Users, Sparkles, ExternalLink, Wifi, Trophy, Play, ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Countdown } from "@/components/countdown"
import { RotatingTagline } from "@/components/rotating-tagline"

export default function HomePage() {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden border-b bg-secondary">
          {/* Background image with strong gradient overlay */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/img-8013.jpeg"
              alt=""
              fill
              className="object-cover opacity-30"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-secondary/85 via-secondary/75 to-secondary" />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-accent/15" />
          </div>

          {/* Decorative animated blur orbs for depth */}
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl animate-pulse" />
            <div
              className="absolute top-1/2 -right-32 h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-3xl animate-pulse"
              style={{ animationDelay: "1.5s", animationDuration: "5s" }}
            />
            <div
              className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-pulse"
              style={{ animationDelay: "3s", animationDuration: "6s" }}
            />
          </div>

          {/* Subtle dot grid texture */}
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
              backgroundSize: "32px 32px",
              color: "var(--secondary-foreground)",
            }}
          />

          <div className="container relative z-10 mx-auto px-6 py-16 md:py-24 lg:py-28">
            <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
              {/* Top eyebrow badge */}
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-secondary-foreground/15 bg-secondary-foreground/5 backdrop-blur-md px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-secondary-foreground/90 shadow-lg">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Christian Homeschool Family Retreat
              </div>

              {/* Hero logo with glow */}
              <div className="relative mb-6 flex items-center justify-center">
                {/* Glow halo behind logo */}
                <div className="absolute inset-0 -z-10 flex items-center justify-center">
                  <div className="h-72 w-72 rounded-full bg-primary/30 blur-3xl md:h-96 md:w-96" />
                </div>
                <div className="relative">
                  <Image
                    src="/rendezvous-logo.png"
                    alt="Rendezvous Homeschool Family Retreat"
                    width={520}
                    height={520}
                    priority
                    className="h-auto w-64 drop-shadow-2xl sm:w-80 md:w-[26rem] lg:w-[32rem]"
                  />
                </div>
              </div>

              {/* Year accent */}
              <div className="mb-4 inline-flex items-center gap-3">
                <span className="h-px w-10 bg-gradient-to-r from-transparent to-primary/60" />
                <span className="text-sm font-semibold uppercase tracking-[0.4em] text-primary">
                  2026 Retreat
                </span>
                <span className="h-px w-10 bg-gradient-to-l from-transparent to-primary/60" />
              </div>

              {/* Rotating tagline */}
              <RotatingTagline className="mb-8 min-h-[3.5rem] flex items-center justify-center text-balance text-2xl font-semibold leading-tight text-secondary-foreground sm:text-3xl md:text-4xl" />

              {/* Date + location row */}
              <div className="mb-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-secondary-foreground/15 bg-secondary-foreground/5 backdrop-blur-sm px-5 py-2.5 text-secondary-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-base font-medium">May 4-8, 2026</span>
                </div>
                <div className="inline-flex items-center gap-2.5 rounded-full border border-secondary-foreground/15 bg-secondary-foreground/5 backdrop-blur-sm px-5 py-2.5 text-secondary-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-base font-medium">Lake Williamson, Carlinville IL</span>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  asChild
                  className="group h-14 px-8 text-base shadow-xl shadow-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/40"
                >
                  <Link href="/schedule">
                    View Full Schedule
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-14 px-8 text-base border-secondary-foreground/20 bg-secondary-foreground/5 backdrop-blur-sm text-secondary-foreground hover:bg-secondary-foreground/10"
                >
                  <Link href="/about">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom fade into next section */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-0 h-24 bg-gradient-to-b from-transparent to-background/40" />
        </section>

        <section className="border-b py-16 bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-3xl">
              <Countdown />
            </div>
          </div>
        </section>

        <section className="border-b py-20 bg-gradient-to-br from-background to-muted/20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-5xl">
              <h2 className="mb-8 text-center text-4xl font-bold tracking-tight">Experience Rendezvous</h2>
              <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl">
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
                      onClick={() => setIsPlaying(true)}
                      className="group absolute inset-0 flex items-center justify-center"
                      aria-label="Play video"
                    >
                      <img
                        src="https://image.mux.com/Fu2mzvA8FO6sEUE01JWv8DvLgRz7K01hmvyBH01DTiDKyc/thumbnail.jpg?width=1200&height=675&fit_mode=smartcrop"
                        alt="Rendezvous retreat preview"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-secondary/80 to-primary/60 backdrop-blur-sm transition-all group-hover:from-secondary/70 group-hover:to-primary/50">
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-all group-hover:scale-110 group-hover:shadow-primary/50">
                          <Play className="h-10 w-10 ml-1" fill="currentColor" />
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b py-16">
          <div className="container mx-auto px-6">
            <div className="grid gap-6 md:grid-cols-4">
              <Card className="border-border/50 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg">
                <CardHeader className="pb-3">
                  <Calendar className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle className="text-lg">5 Days / 4 Nights</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">
                    Lots of time for fellowship, worship, recreation, & encouragement!
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg">
                <CardHeader className="pb-3">
                  <MapPin className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle className="text-lg">Beautiful Facility</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">
                    Lake Williamson Christian Center with extensive amenities
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg">
                <CardHeader className="pb-3">
                  <Users className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle className="text-lg">All Ages</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">
                    Activities designed for children through adults
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg">
                <CardHeader className="pb-3">
                  <Sparkles className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle className="text-lg">All Meals Included</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">
                    Buffet-style dining with no cooking or cleanup
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-b py-20">
          <div className="container mx-auto max-w-4xl px-6">
            <h2 className="mb-8 text-balance text-4xl font-bold tracking-tight text-center">
              Join Us for Fellowship & Fun
            </h2>
            <div className="space-y-6 text-lg leading-relaxed text-muted-foreground">
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Button variant="default" size="lg" asChild>
                  <Link href="/about">Learn More About Rendezvous</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-6">
            <h2 className="mb-12 text-center text-4xl font-bold tracking-tight">What to Expect</h2>
            <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-border/50 bg-gradient-to-br from-card to-muted/30 transition-all hover:shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Lodging Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="leading-relaxed text-muted-foreground">
                    Choose from motel rooms (sleeps up to 6), RV sites, or tent camping. Motel rooms include linens and
                    private bathrooms.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-gradient-to-br from-card to-muted/30 transition-all hover:shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Recreation Activities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="leading-relaxed text-muted-foreground">
                    Archery, swimming, black-light dodgeball, nine square, basketball, volleyball, ping pong, mini golf,
                    canoeing, tournaments, and more!
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-gradient-to-br from-card to-muted/30 transition-all hover:shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Buffet Dining
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="leading-relaxed text-muted-foreground">
                    11 meals are buffet style in the Lakeside Dining Room plus 1 cookout by the lake (weather
                    permitting). LWCC handles all cooking and cleanup. Gluten-free foods are labeled. Refrigerator space
                    is available to store food for those with special dietary needs.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-gradient-to-br from-card to-accent/10 transition-all hover:shadow-xl lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Bible Bowl
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="leading-relaxed text-muted-foreground">
                    Everyone is encouraged to participate in the Bible Bowl on Thursday morning (children & adults).
                    This is a great study opportunity for families!
                  </p>
                  <a
                    href="https://pewpackers.com/"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:underline"
                  >
                    Bible Bowl
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-gradient-to-br from-card to-accent/10 transition-all hover:shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wifi className="h-5 w-5 text-primary" />
                    Event WiFi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="font-mono text-sm">
                      <span className="font-semibold">Network:</span> LWCC
                    </p>
                    <p className="font-mono text-sm">
                      <span className="font-semibold">Password:</span> wifi4lwcc
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-t bg-secondary py-20">
          <div className="container mx-auto px-6 text-center">
            <h2 className="mb-4 text-balance text-4xl font-bold tracking-tight text-secondary-foreground">
              See You at the Event!
            </h2>
            <p className="mb-8 text-balance text-lg text-secondary-foreground/70">
              Rendezvous 2026 is coming soon. Get ready for an amazing fellowship!
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="h-14 px-8 text-base" asChild>
                <Link href="/schedule">View Schedule</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-14 px-8 text-base border-secondary-foreground/20 bg-transparent text-secondary-foreground hover:bg-secondary-foreground/10"
              >
                <a href="https://www.facebook.com/groups/RendezvousIL" target="_blank" rel="noreferrer noopener">
                  Join Facebook Group
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
