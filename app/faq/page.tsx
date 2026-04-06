"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, Play } from "lucide-react"
import { useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

const faqVideos = [
  {
    id: "djuAc8QIk6pPNX1mGigB5MEAN02UeuydJQW01GhiCZlIU",
    title: "Rendezvous History",
    slug: "history",
  },
  {
    id: "O9702XLr9hbXUXZDlUvdiDym01nmI4200QDyaHNZN2voa4",
    title: "What would you say to someone considering Rendezvous?",
    slug: "considering",
  },
  {
    id: "t5rSCgJyzdARvSHl6mg3dzOTlUEUPiU402IVnPE5Z01Lg",
    title: "What was the first Rendezvous like? What were your hopes?",
    slug: "first-rendezvous",
  },
  {
    id: "t702glXRQfZPScT8634nxzupciWgx4gBBQYf95zDNLX00",
    title: "What impact do you hope Rendezvous has on families?",
    slug: "impact",
  },
  {
    id: "52ijJu2b024JTBOBFjTFTyPGYl022Su9KbU8Axfis01UEU",
    title: "What is your vision for the future of Rendezvous?",
    slug: "vision",
  },
  {
    id: "cITgjTG4V01MOdvLpRNysTwnX7CTS4UHYG4qrFM2xnW8",
    title: "What does Rendezvous mean to you?",
    slug: "meaning",
  },
]

function VideoCard({ video }: { video: (typeof faqVideos)[0] }) {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <Card className="overflow-hidden border-border/50 bg-card shadow-lg transition-all hover:shadow-xl">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 pb-4">
        <CardTitle className="text-pretty text-xl font-semibold leading-tight md:text-2xl">{video.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-video w-full bg-muted">
          {/* iframe pre-loads in background, shown instantly on click */}
          <iframe
            src={`https://player.mux.com/${video.id}${isPlaying ? "?autoplay=1" : ""}`}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen={true}
            frameBorder="0"
            style={{ border: "none", opacity: isPlaying ? 1 : 0, pointerEvents: isPlaying ? "auto" : "none" }}
          />

          {/* Custom branded overlay — hidden once playing */}
          {!isPlaying && (
            <button
              onClick={() => setIsPlaying(true)}
              className="group absolute inset-0 flex items-center justify-center"
            >
              <img
                src={`https://image.mux.com/${video.id}/thumbnail.jpg?width=1280&height=720&fit_mode=smartcrop`}
                alt={video.title}
                className="h-full w-full object-cover"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-opacity group-hover:from-black/70" />

              {/* Rendezvous logo watermark */}
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-lg backdrop-blur-sm">
                <img src="/rendezvous-logo.png" alt="Rendezvous" className="h-6 w-auto" />
              </div>

              {/* Play button */}
              <div className="absolute flex flex-col items-center gap-3">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-2xl ring-4 ring-white/30 transition-all group-hover:scale-110 group-hover:ring-white/50">
                  <Play className="ml-1 h-10 w-10 fill-primary-foreground text-primary-foreground" />
                </div>
                <span className="rounded-full bg-black/50 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                  Watch Video
                </span>
              </div>

              {/* Bottom bar */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-8">
                <p className="text-sm font-medium text-white/90">Rendezvous Homeschool Family Retreat</p>
              </div>
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function FAQPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="border-b bg-secondary py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="mb-4 text-balance text-5xl font-bold tracking-tight text-secondary-foreground md:text-6xl">
                Frequently Asked Questions
              </h1>
              <p className="text-balance text-lg text-secondary-foreground/70">
                Learn more about Rendezvous from those who know it best
              </p>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-6xl space-y-8">
              {faqVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-secondary py-20">
          <div className="container mx-auto px-6 text-center">
            <h2 className="mb-4 text-balance text-4xl font-bold tracking-tight text-secondary-foreground">
              Still Have Questions?
            </h2>
            <p className="mb-8 text-balance text-lg text-secondary-foreground/70">
              Contact us or join our Facebook group to connect with other families
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="h-14 px-8 text-base" asChild>
                <a href="mailto:Stephen@Bradd.us">Contact Us</a>
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
