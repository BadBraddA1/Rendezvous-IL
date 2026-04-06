"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, MapPin, Users, Sparkles, ExternalLink, Wifi, Trophy, Play } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Countdown } from "@/components/countdown"

export default function HomePage() {
  const [isPlaying, setIsPlaying] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handlePlayClick = () => {
    setIsPlaying(true)
    // Trigger play after iframe mounts
    setTimeout(() => {
      if (iframeRef.current) {
        iframeRef.current.contentWindow?.postMessage({ type: "play" }, "*")
      }
    }, 100)
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b bg-secondary py-20 md:py-32">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/img-8013.jpeg"
              alt="Rendezvous retreat group photo"
              fill
              className="object-cover opacity-40"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-secondary/60 via-secondary/70 to-secondary/90" />
          </div>
          <div className="container relative z-10 mx-auto px-6">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-secondary-foreground/20 bg-secondary-foreground/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-secondary-foreground">
                <Sparkles className="h-4 w-4" />
                Christian Homeschool Family Retreat for Members of the Church of Christ
              </div>
              <h1 className="mb-6 text-balance text-5xl font-bold leading-[1.1] tracking-tight text-secondary-foreground md:text-7xl">
                Rendezvous 2026
              </h1>
              <p className="mb-4 text-balance text-2xl text-secondary-foreground/80 md:text-3xl">May 4–8, 2026</p>
              <p className="mb-8 text-balance text-lg text-secondary-foreground/70 md:text-xl">
                Lake Williamson Christian Center, Carlinville, IL
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" className="h-14 px-8 text-base" asChild>
                  <Link href="/schedule">View Full Schedule</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-14 px-8 text-base border-secondary-foreground/20 bg-secondary-foreground/5 backdrop-blur-sm text-secondary-foreground hover:bg-secondary-foreground/10"
                >
                  <Link href="/about">About Rendezvous</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Event Countdown */}
        <section className="border-b py-16 bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-2 text-2xl font-bold tracking-tight">The Event Starts In</h2>
              <p className="mb-8 text-muted-foreground">Monday, May 4, 2026 · Lake Williamson Christian Center</p>
              <Countdown />
            </div>
          </div>
        </section>

        {/* Video */}
        <section className="border-b py-20 bg-gradient-to-br from-background to-muted/20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-5xl">
              <h2 className="mb-8 text-center text-4xl font-bold tracking-tight">Experience Rendezvous</h2>
              <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl">
                <div className="relative aspect-video w-full group">
                  {isPlaying ? (
                    <iframe
                      ref={iframeRef}
                      src="https://player.mux.com/Fu2mzvA8FO6sEUE01JWv8DvLgRz7K01hmvyBH01DTiDKyc"
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen={true}
                      frameBorder="0"
                      style={{ border: "none" }}
                    />
                  ) : (
                    <button
                      onClick={handlePlayClick}
                      className="group absolute inset-0 flex items-center justify-center focus:outline-none"
                      aria-label="Play video"
                    >
                      <img
                        src="https://image.mux.com/Fu2mzvA8FO6sEUE01JWv8DvLgRz7K01hmvyBH01DTiDKyc/thumbnail.jpg?width=1200&height=675&fit_mode=smartcrop"
                        alt="Rendezvous retreat preview"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-secondary/80 to-primary/60 backdrop-blur-sm transition-all group-hover:from-secondary/70 group-hover:to-primary/50" />
                      <div className="absolute flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-all group-hover:scale-110 group-hover:shadow-primary/50">
                        <Play className="ml-1 h-10 w-10" fill="currentColor" />
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* At-a-glance */}
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
                    Lots of time for fellowship, worship, recreation, &amp; encouragement!
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

        {/* Learn More */}
        <section className="border-b py-20">
          <div className="container mx-auto max-w-4xl px-6">
            <h2 className="mb-8 text-balance text-4xl font-bold tracking-tight text-center">
              Join Us for Fellowship &amp; Fun
            </h2>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button variant="default" size="lg" asChild>
                <Link href="/about">Learn More About Rendezvous</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* What to Expect */}
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
                    11 meals buffet style in the Lakeside Dining Room plus 1 cookout by the lake (weather permitting).
                    LWCC handles all cooking and cleanup. Gluten-free foods are labeled. Refrigerator space available for
                    special dietary needs.
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
                    Everyone is encouraged to participate in the Bible Bowl on Thursday morning (children &amp; adults).
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

        {/* Bottom CTA */}
        <section className="border-t bg-secondary py-20">
          <div className="container mx-auto px-6 text-center">
            <h2 className="mb-4 text-balance text-4xl font-bold tracking-tight text-secondary-foreground">
              See You at Rendezvous 2026!
            </h2>
            <p className="mb-8 text-balance text-lg text-secondary-foreground/70">
              May 4–8 · Lake Williamson Christian Center · Carlinville, IL
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="h-14 px-8 text-base" asChild>
                <Link href="/schedule">View the Schedule</Link>
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
