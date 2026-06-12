"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ExternalLink } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { MuxVideoPlayer } from "@/components/mux-video-player"

type FaqItem = {
  id: string
  question: string
  answer: React.ReactNode
}

const faqItems: FaqItem[] = [
  {
    id: "what-is-rendezvous",
    question: "What is Rendezvous?",
    answer:
      "Rendezvous is a 5-day, 4-night Christian family retreat specifically designed for homeschooling families. It's a time of fellowship, worship, recreation, and encouragement held at Lake Williamson Christian Center in Carlinville, IL.",
  },
  {
    id: "when-2027",
    question: "When is Rendezvous 2027?",
    answer:
      "Rendezvous 2027 will be held May 3–7, 2027 (Monday through Friday). Registration opens January 1, 2027.",
  },
  {
    id: "who-can-attend",
    question: "Who can attend?",
    answer:
      "Rendezvous is open to Christian families who homeschool their children. The retreat is designed for the whole family — parents and children of all ages are welcome and encouraged to attend together.",
  },
  {
    id: "registration-includes",
    question: "What's included in registration?",
    answer:
      "Registration includes lodging, all meals (starting with Monday dinner through Friday breakfast), access to all activities and facilities, Bible Bowl participation, evening programs, and recreational activities like swimming, sports, and the climbing tower.",
  },
  {
    id: "lodging-options",
    question: "What are the lodging options?",
    answer:
      "Lake Williamson offers hotel-style rooms and motel-style rooms. Hotel rooms have private bathrooms, while motel rooms have shared bathroom facilities. Both options are comfortable and family-friendly. Tent camping is also available for those who prefer it.",
  },
  {
    id: "bible-bowl",
    question: "What is Bible Bowl?",
    answer: (
      <>
        Bible Bowl is a highlight of Rendezvous where families study a book of the Bible together before the retreat,
        then participate in friendly competition during the week. For 2027, we&apos;ll be studying 1 Samuel. It&apos;s a
        wonderful way for families to dive deep into Scripture together.{" "}
        <Link href="/biblebowl" className="focus-ring rounded-sm font-medium text-primary hover:underline">
          Learn more about Bible Bowl
        </Link>
        .
      </>
    ),
  },
  {
    id: "activities",
    question: "What activities are available?",
    answer:
      "Activities include swimming, basketball, volleyball, gaga ball, hiking trails, fishing, a climbing tower, archery, campfires, and much more. There are also organized games, crafts for children, and fellowship time for adults.",
  },
  {
    id: "food",
    question: "Can we bring our own food?",
    answer:
      "All meals are provided and included in your registration. However, if you have specific dietary needs or allergies, please note them during registration and we'll do our best to accommodate you. You're welcome to bring snacks for your family.",
  },
  {
    id: "refund-policy",
    question: "What's the refund policy?",
    answer: (
      <>
        Refund policies vary depending on how close to the event you cancel. Please contact us directly at{" "}
        <a
          href="mailto:Stephen@Bradd.us"
          className="focus-ring rounded-sm font-medium text-primary hover:underline"
        >
          Stephen@Bradd.us
        </a>{" "}
        for specific refund inquiries. We understand circumstances change and will work with you.
      </>
    ),
  },
  {
    id: "children-cost",
    question: "Is there a cost for children?",
    answer: (
      <>
        Yes, pricing varies by age. Children under 3 are free, and there are reduced rates for different age groups.
        Use our{" "}
        <Link href="/calculator" className="focus-ring rounded-sm font-medium text-primary hover:underline">
          cost calculator
        </Link>{" "}
        to get an accurate estimate for your family.
      </>
    ),
  },
]

const faqVideos = [
  {
    id: "djuAc8QIk6pPNX1mGigB5MEAN02UeuydJQW01GhiCZlIU",
    title: "Rendezvous history",
  },
  {
    id: "O9702XLr9hbXUXZDlUvdiDym01nmI4200QDyaHNZN2voa4",
    title: "What would you say to someone considering Rendezvous?",
  },
  {
    id: "t5rSCgJyzdARvSHl6mg3dzOTlUEUPiU402IVnPE5Z01Lg",
    title: "What was the first Rendezvous like?",
  },
  {
    id: "t702glXRQfZPScT8634nxzupciWgx4gBBQYf95zDNLX00",
    title: "What impact do you hope Rendezvous has on families?",
  },
  {
    id: "52ijJu2b024JTBOBFjTFTyPGYl022Su9KbU8Axfis01UEU",
    title: "What is your vision for the future?",
  },
  {
    id: "cITgjTG4V01MOdvLpRNysTwnX7CTS4UHYG4qrFM2xnW8",
    title: "What does Rendezvous mean to you?",
  },
]

function VideoCard({
  video,
  isPlaying,
  onPlay,
}: {
  video: (typeof faqVideos)[0]
  isPlaying: boolean
  onPlay: () => void
}) {
  return (
    <article className="group">
      <div className="overflow-hidden rounded-xl border border-primary/15 bg-card">
        <MuxVideoPlayer
          playbackId={video.id}
          title={video.title}
          isActive={isPlaying}
          onActivate={onPlay}
        />
      </div>
      <p className="mt-3 text-sm font-medium leading-snug text-foreground text-pretty line-clamp-2">{video.title}</p>
    </article>
  )
}

export default function FAQPage() {
  const [playingVideo, setPlayingVideo] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main id="main-content">
        <section className="section-lg pt-[calc(5.5rem+env(safe-area-inset-top,0px))]">
          <div className="site-container">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,17.5rem)_1fr] lg:gap-16 xl:gap-20">
              <header className="lg:sticky lg:top-[calc(5.5rem+env(safe-area-inset-top,0px))] lg:self-start">
                <h1 className="text-page-title text-balance">Frequently asked questions</h1>
                <p className="mt-4 text-lead text-muted-foreground text-pretty">
                  Everything you need to know about Rendezvous 2027
                </p>
              </header>

              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item) => (
                  <AccordionItem
                    key={item.id}
                    value={item.id}
                    className="border-b border-primary/15 py-1 last:border-b-0"
                  >
                    <AccordionTrigger className="font-display py-5 text-left text-base font-semibold hover:no-underline md:text-lg">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="measure-prose pb-6 text-base leading-relaxed text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        <section className="section-lg border-t border-primary/15 bg-surface-highlight">
          <div className="faq-videos-campfire site-container">
            <header className="mb-8 md:mb-10">
              <p className="faq-videos-campfire-script">Around the campfire</p>
              <h2 className="text-section-title text-balance">Stephen &amp; Ranae tell the Rendezvous story</h2>
              <p className="mt-2 text-muted-foreground">Six short clips—grab one and listen in</p>
            </header>
            <div className="faq-videos-campfire-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {faqVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  isPlaying={playingVideo === video.id}
                  onPlay={() => setPlayingVideo(video.id)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="section-lg border-t border-primary/15">
          <div className="site-container text-center">
            <h2 className="text-section-title mb-4 text-balance">Still have questions?</h2>
            <p className="measure-prose mx-auto mb-8 text-lead text-muted-foreground">
              We&apos;re here to help. Reach out directly or connect with other families in our community.
            </p>
            <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Button size="lg" className="h-11 gap-2" asChild>
                <a href="mailto:Stephen@Bradd.us">Contact us</a>
              </Button>
              <Button size="lg" variant="outline" className="h-11 gap-2 border-primary/25" asChild>
                <a href="https://www.facebook.com/groups/RendezvousIL" target="_blank" rel="noreferrer noopener">
                  Join Facebook group
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
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
