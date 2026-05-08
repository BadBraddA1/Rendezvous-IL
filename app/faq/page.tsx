"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ExternalLink, Play, Video } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

const faqItems = [
  {
    question: "What is Rendezvous?",
    answer: "Rendezvous is a 5-day, 4-night Christian family retreat specifically designed for homeschooling families. It's a time of fellowship, worship, recreation, and encouragement held at Lake Williamson Christian Center in Carlinville, IL."
  },
  {
    question: "When is Rendezvous 2027?",
    answer: "Rendezvous 2027 will be held May 3-7, 2027 (Monday through Friday). Registration opens January 1, 2027."
  },
  {
    question: "Who can attend?",
    answer: "Rendezvous is open to Christian families who homeschool their children. The retreat is designed for the whole family - parents and children of all ages are welcome and encouraged to attend together."
  },
  {
    question: "What's included in the registration?",
    answer: "Registration includes lodging, all meals (starting with Monday dinner through Friday breakfast), access to all activities and facilities, Bible Bowl participation, evening programs, and recreational activities like swimming, sports, and the climbing tower."
  },
  {
    question: "What are the lodging options?",
    answer: "Lake Williamson offers hotel-style rooms and motel-style rooms. Hotel rooms have private bathrooms, while motel rooms have shared bathroom facilities. Both options are comfortable and family-friendly. Tent camping is also available for those who prefer it."
  },
  {
    question: "What is Bible Bowl?",
    answer: "Bible Bowl is a highlight of Rendezvous where families study a book of the Bible together before the retreat, then participate in friendly competition during the week. For 2027, we'll be studying 1 Samuel. It's a wonderful way for families to dive deep into Scripture together."
  },
  {
    question: "What activities are available?",
    answer: "Activities include swimming, basketball, volleyball, gaga ball, hiking trails, fishing, a climbing tower, archery, campfires, and much more. There are also organized games, crafts for children, and fellowship time for adults."
  },
  {
    question: "Can we bring our own food?",
    answer: "All meals are provided and included in your registration. However, if you have specific dietary needs or allergies, please note them during registration and we'll do our best to accommodate you. You're welcome to bring snacks for your family."
  },
  {
    question: "What's the refund policy?",
    answer: "Refund policies vary depending on how close to the event you cancel. Please contact us directly at Stephen@Bradd.us for specific refund inquiries. We understand circumstances change and will work with you."
  },
  {
    question: "Is there a cost for children?",
    answer: "Yes, pricing varies by age. Children under 3 are free, and there are reduced rates for different age groups. Use our Cost Calculator to get an accurate estimate for your family."
  },
]

const faqVideos = [
  {
    id: "djuAc8QIk6pPNX1mGigB5MEAN02UeuydJQW01GhiCZlIU",
    title: "Rendezvous History",
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

function VideoCard({ video, isPlaying, onPlay }: { 
  video: typeof faqVideos[0]
  isPlaying: boolean
  onPlay: () => void 
}) {
  return (
    <div className="group">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
        {!isPlaying ? (
          <button
            onClick={onPlay}
            className="absolute inset-0 flex items-center justify-center"
          >
            <img
              src={`https://image.mux.com/${video.id}/thumbnail.jpg?width=640&height=360&fit_mode=smartcrop`}
              alt={video.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/30 transition-opacity group-hover:bg-black/40" />
            <div className="absolute flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-xl transition-transform group-hover:scale-110">
              <Play className="ml-0.5 h-6 w-6 fill-primary-foreground text-primary-foreground" />
            </div>
          </button>
        ) : (
          <iframe
            src={`https://player.mux.com/${video.id}?autoplay=1`}
            className="h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
      <p className="mt-3 text-sm font-medium text-foreground line-clamp-2">{video.title}</p>
    </div>
  )
}

export default function FAQPage() {
  const [playingVideo, setPlayingVideo] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="pt-20 md:pt-24">
        {/* FAQ Section - Two Column Layout */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-6">
            <div className="grid gap-12 lg:grid-cols-[280px_1fr] lg:gap-16 xl:gap-24">
              {/* Left Column - Title */}
              <div className="lg:sticky lg:top-32 lg:self-start">
                <h1 className="text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
                  FAQ
                </h1>
                <p className="mt-4 text-muted-foreground">
                  Everything you need to know about Rendezvous 2027
                </p>
              </div>

              {/* Right Column - Questions */}
              <div>
                <Accordion type="single" collapsible className="w-full">
                  {faqItems.map((item, index) => (
                    <AccordionItem 
                      key={index} 
                      value={`item-${index}`}
                      className="border-b border-border/50 py-2"
                    >
                      <AccordionTrigger className="text-left text-lg font-medium hover:no-underline md:text-xl py-5">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </div>
        </section>

        {/* Videos Section */}
        <section className="border-t bg-secondary/30 py-16 md:py-24">
          <div className="container mx-auto px-6">
            <div className="mb-12 flex items-center gap-3">
              <Video className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold md:text-3xl">
                Hear From Our Community
              </h2>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

        {/* Contact Section */}
        <section className="border-t py-16 md:py-24">
          <div className="container mx-auto px-6 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Still Have Questions?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground max-w-xl mx-auto">
              We&apos;re here to help. Reach out directly or connect with other families in our community.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-6" asChild>
                <a href="mailto:Stephen@Bradd.us">Contact Us</a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 px-6"
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
