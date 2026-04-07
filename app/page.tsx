"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, MapPin, Users, Sparkles, ExternalLink, Wifi, Trophy, Play } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { EventStatus } from "@/components/event-status"

export default function HomePage() {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden border-b bg-secondary">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/img-8013.jpeg"
              alt="Rendezvous retreat group photo"
              fill
              className="object-cover opacity-30"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-secondary/70 via-secondary/75 to-secondary" />
          </div>

          <div className="container relative z-10 mx-auto px-6 py-20 md:py-32">
            <div className="mx-auto max-w-4xl text-center">
              {/* Eyebrow */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-secondary-foreground/20 bg-secondary-foreground/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-secondary-foreground">
                <Sparkles className="h-4 w-4" />
                Christian Homeschool Family Retreat &middot; Church of Christ
              </div>

              {/* Title */}
              <h1 className="mb-4 text-balance text-5xl font-bold leading-[1.1] tracking-tight text-secondary-foreground md:text-7xl">
                Rendezvous 2026
              </h1>

              {/* Date + location */}
              <p className="mb-2 text-balance text-2xl font-medium text-secondary-foreground/85 md:text-3xl">
                May 4–8, 2026
              </p>
              <p className="mb-10 flex items-center justify-center gap-1.5 text-secondary-foreground/70">
                <MapPin className="h-4 w-4 shrink-0" />
                Lake Williamson Christian Center, Carlinville, IL
              </p>

              {/* Primary CTAs (visible only pre-event) */}
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-secondary-foreground/20 bg-secondary-foreground/5 px-8 text-base text-secondary-foreground backdrop-blur-sm hover:bg-secondary-foreground/10"
                  asChild
                >
                  <Link href="/schedule">View Full Schedule</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-secondary-foreground/20 bg-secondary-foreground/5 px-8 text-base text-secondary-foreground backdrop-blur-sm hover:bg-secondary-foreground/10"
                  asChild
                >
                  <Link href="/about">About Rendezvous</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Event Status Card ── */}
        <section className="border-b bg-muted/30 py-16">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-2xl rounded-3xl border border-border/60 bg-card p-8 shadow-xl md:p-12">
              <EventStatus />
            </div>
          </div>
        </section>

        {/* ── Video ── */}
        <section className="border-b py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-5xl">
              <h2 className="mb-8 text-center text-4xl font-bold tracking-tight">
                Experience Rendezvous
              </h2>
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
                      aria-label="Play Rendezvous video"
                    >
                      <img
                        src="https://image.mux.com/Fu2mzvA8FO6sEUE01JWv8DvLgRz7K01hmvyBH01DTiDKyc/thumbnail.jpg?width=1200&height=675&fit_mode=smartcrop"
                        alt="Rendezvous retreat preview"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-secondary/60 transition-all group-hover:bg-secondary/50">
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-all group-hover:scale-110">
                          <Play className="ml-1 h-10 w-10" fill="currentColor" />
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Feature strip ── */}
        <section className="border-b py-16">
          <div className="container mx-auto px-6">
            <div className="grid gap-6 md:grid-cols-4">
              {[
                {
                  icon: <Calendar className="mb-2 h-8 w-8 text-primary" />,
                  title: "5 Days / 4 Nights",
                  body: "Lots of time for fellowship, worship, recreation, and encouragement!",
                },
                {
                  icon: <MapPin className="mb-2 h-8 w-8 text-primary" />,
                  title: "Beautiful Facility",
                  body: "Lake Williamson Christian Center with extensive amenities",
                },
                {
                  icon: <Users className="mb-2 h-8 w-8 text-primary" />,
                  title: "All Ages",
                  body: "Activities designed for children through adults",
                },
                {
                  icon: <Sparkles className="mb-2 h-8 w-8 text-primary" />,
                  title: "All Meals Included",
                  body: "Buffet-style dining with no cooking or cleanup",
                },
              ].map((f) => (
                <Card
                  key={f.title}
                  className="border-border/50 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg"
                >
                  <CardHeader className="pb-3">
                    {f.icon}
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="leading-relaxed">{f.body}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── What to Expect ── */}
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
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">
                    Choose from motel rooms (sleeps up to 6), RV sites, or tent camping. Motel rooms include linens
                    and private bathrooms.
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
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">
                    Archery, swimming, black-light dodgeball, nine square, basketball, volleyball, ping pong,
                    mini golf, canoeing, tournaments, and more!
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
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">
                    11 meals are buffet style in the Lakeside Dining Room plus 1 cookout by the lake (weather
                    permitting). LWCC handles all cooking and cleanup.
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
                    Everyone is encouraged to participate in the Bible Bowl on Thursday morning (children &amp;
                    adults). A great study opportunity for families!
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
                <CardContent>
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

        {/* ── Footer CTA ── */}
        <section className="border-t bg-secondary py-20">
          <div className="container mx-auto px-6 text-center">
            <h2 className="mb-4 text-balance text-4xl font-bold tracking-tight text-secondary-foreground">
              See You in May!
            </h2>
            <p className="mb-8 text-balance text-lg text-secondary-foreground/70">
              We&apos;re looking forward to a wonderful week of fellowship and fun at Rendezvous 2026.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-secondary-foreground/20 bg-transparent px-8 text-base text-secondary-foreground hover:bg-secondary-foreground/10"
                asChild
              >
                <Link href="/schedule">View Schedule</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-secondary-foreground/20 bg-transparent px-8 text-base text-secondary-foreground hover:bg-secondary-foreground/10"
                asChild
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
