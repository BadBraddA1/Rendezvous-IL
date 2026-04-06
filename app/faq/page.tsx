"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, Play } from "lucide-react"

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
  return (
    <Card className="overflow-hidden border-border/50 bg-card shadow-lg transition-all hover:shadow-xl">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 pb-4">
        <CardTitle className="text-pretty text-xl font-semibold leading-tight md:text-2xl">{video.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-video w-full bg-muted">
          <iframe
            src={`https://player.mux.com/${video.id}?accent-color=%23f97316&primary-color=%23ffffff`}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen={true}
            frameBorder="0"
            style={{ border: "none" }}
          />
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
