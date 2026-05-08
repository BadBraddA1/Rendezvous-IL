"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, MapPin, Users, Sparkles, ExternalLink, Wifi, Trophy, Play, ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { HeroSection } from "@/components/hero-section"
import { RegistrationCountdown2027 } from "@/components/registration-countdown-2027"

export default function HomePage() {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* Full-screen Hero */}
        <HeroSection />

        {/* Registration Countdown */}
        <RegistrationCountdown2027 />

        {/* Experience Video Section */}
        <section className="py-20 bg-gradient-to-b from-background to-secondary/20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-5xl">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
                  Experience Rendezvous
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  See what makes our Christian homeschool family retreat so special
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl shadow-primary/5">
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
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-background/90 to-primary/30 backdrop-blur-sm transition-all group-hover:from-background/80 group-hover:to-primary/40">
                        <div className="flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-all group-hover:scale-110 group-hover:shadow-primary/50">
                          <Play className="h-8 w-8 md:h-10 md:w-10 ml-1" fill="currentColor" />
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="py-16 border-y border-border/50">
          <div className="container mx-auto px-6">
            <div className="grid gap-6 md:grid-cols-4">
              <Card className="border-border/50 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 group">
                <CardHeader className="pb-3">
                  <Calendar className="mb-2 h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                  <CardTitle className="text-lg text-foreground">5 Days / 4 Nights</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">
                    Lots of time for fellowship, worship, recreation, & encouragement!
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 group">
                <CardHeader className="pb-3">
                  <MapPin className="mb-2 h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                  <CardTitle className="text-lg text-foreground">Beautiful Facility</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">
                    Lake Williamson Christian Center with extensive amenities
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 group">
                <CardHeader className="pb-3">
                  <Users className="mb-2 h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                  <CardTitle className="text-lg text-foreground">All Ages</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">
                    Activities designed for children through adults
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 group">
                <CardHeader className="pb-3">
                  <Sparkles className="mb-2 h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                  <CardTitle className="text-lg text-foreground">All Meals Included</CardTitle>
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

        {/* About Section */}
        <section className="py-20">
          <div className="container mx-auto max-w-4xl px-6">
            <div className="text-center">
              <span className="inline-block mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
                Christian Homeschool Family Retreat
              </span>
              <h2 className="mb-6 text-balance text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                Join Us for Fellowship & Fun
              </h2>
              <p className="mb-8 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Rendezvous is a 5-day, 4-night retreat filled with fellowship, worship, recreation, 
                and encouragement for Christian families who educate their children at home.
              </p>
              <Button size="lg" className="h-14 px-8 text-base" asChild>
                <Link href="/about">
                  Learn More About Rendezvous
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* What to Expect */}
        <section className="py-20 bg-secondary/30">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">What to Expect</h2>
            </div>
            <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-border/50 bg-card transition-all hover:shadow-xl hover:shadow-primary/5 group">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
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

              <Card className="border-border/50 bg-card transition-all hover:shadow-xl hover:shadow-primary/5 group">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
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

              <Card className="border-border/50 bg-card transition-all hover:shadow-xl hover:shadow-primary/5 group">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Calendar className="h-5 w-5 text-primary" />
                    Buffet Dining
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="leading-relaxed text-muted-foreground">
                    11 meals are buffet style plus 1 cookout by the lake. LWCC handles all cooking and cleanup. 
                    Gluten-free foods are labeled.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card transition-all hover:shadow-xl hover:shadow-primary/5 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
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
                    Learn About Bible Bowl
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card transition-all hover:shadow-xl hover:shadow-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Wifi className="h-5 w-5 text-primary" />
                    Event WiFi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg bg-secondary/50 p-4 border border-border/50">
                    <p className="font-mono text-sm text-foreground">
                      <span className="font-semibold">Network:</span> LWCC
                    </p>
                    <p className="font-mono text-sm text-foreground">
                      <span className="font-semibold">Password:</span> wifi4lwcc
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* 2027 Updates Section */}
        <section className="py-20 border-t border-border/50">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <span className="inline-block mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
                  Coming in 2027
                </span>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
                  What&apos;s New for 2027
                </h2>
                <p className="text-lg text-muted-foreground">
                  Here&apos;s what we&apos;re planning for the next Rendezvous
                </p>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border/50 bg-card p-6 hover:border-primary/30 transition-colors">
                  <h3 className="font-semibold text-foreground mb-2">New Dates</h3>
                  <p className="text-muted-foreground">May 3-7, 2027 (Monday - Friday)</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-6 hover:border-primary/30 transition-colors">
                  <h3 className="font-semibold text-foreground mb-2">Registration Opens</h3>
                  <p className="text-muted-foreground">January 1, 2027</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-6 hover:border-primary/30 transition-colors">
                  <h3 className="font-semibold text-foreground mb-2">2027 Theme / Bible Bowl</h3>
                  <p className="text-muted-foreground">1 Samuel</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-6 hover:border-primary/30 transition-colors">
                  <h3 className="font-semibold text-foreground mb-2">Same Great Location</h3>
                  <p className="text-muted-foreground">Lake Williamson Christian Center, Carlinville, IL</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="container mx-auto px-6 text-center">
            <h2 className="mb-4 text-balance text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              See You at Rendezvous 2027!
            </h2>
            <p className="mb-8 text-balance text-lg text-muted-foreground max-w-2xl mx-auto">
              Get ready for an amazing time of fellowship, faith, and fun with homeschool families from across the country.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="h-14 px-8 text-base font-semibold" asChild>
                <Link href="/schedule">View Schedule</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-14 px-8 text-base font-semibold border-primary/30 hover:bg-primary/10"
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
