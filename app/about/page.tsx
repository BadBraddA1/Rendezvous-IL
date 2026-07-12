import Link from "next/link"
import {
  ExternalLink,
  Users,
  Building,
  Calendar,
  MapPin,
  Tent,
  UtensilsCrossed,
  Waves,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { attendanceHistory, latestCompletedAttendance } from "@/lib/attendance-history"

const lastGathering = latestCompletedAttendance()

const facilityHighlights = [
  {
    icon: Waves,
    title: "Recreation",
    text: "Archery, mini golf, black-light dodgeball, nine square, basketball, volleyball, obstacle course, rock wall, indoor pool, kickball, disc golf, canoeing, ping pong, billiards, zip line, and more.",
  },
  {
    icon: UtensilsCrossed,
    title: "Dining",
    text: "Buffet meals in a lakeside dining hall (seats 500). A couple entrees and sides per meal, full salad bar, desserts, and drinks—no cooking or cleanup for families.",
  },
  {
    icon: Tent,
    title: "Lodging",
    text: "Motel rooms (sleep up to 6 with private bath), RV sites, or tent camping. RV and tent campers use shower rooms at the indoor pool (~100 yards away). Washers and dryers on site.",
  },
] as const

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main id="main-content">
        <section className="site-below-header-loose site-page-intro border-b border-primary/15 bg-surface-lake pb-12 md:pb-16">
          <div className="site-container">
            <div className="mx-auto max-w-3xl text-center">
              <p className="about-hero-greeting">Greetings, brethren</p>
              <h1 className="text-page-title mb-4 text-balance text-on-surface">About Rendezvous</h1>
              <p className="measure-prose mx-auto text-balance text-lead text-on-surface/85">
                A 5-day / 4-night gathering built on fellowship, worship, recreation, and encouragement—near St. Louis at
                Lake Williamson Christian Center.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-on-surface/80">
                <span className="rounded-lg border border-primary/15 bg-card/60 px-3 py-2">Est. 2015</span>
                <span className="rounded-lg border border-primary/15 bg-card/60 px-3 py-2">First Monday in May</span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/15 bg-card/60 px-3 py-2">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  Carlinville, IL
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="section-sm border-b border-border/50">
          <div className="site-container max-w-4xl">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-10">
              <div className="space-y-6">
                <div>
                  <h2 className="text-section-title mb-4 text-balance">Our story</h2>
                  <div className="measure-prose space-y-4 text-muted-foreground">
                    <p className="text-base leading-relaxed md:text-lg">
                      Greetings brethren! Our family has enjoyed Roundhouse for 20 years now and plans to continue
                      attending indefinitely, Lord willing. We appreciate the fellowship so much and look forward to it
                      annually, despite the lengthy drive.
                    </p>
                    <p className="text-base leading-relaxed md:text-lg">
                      We became aware of an alternative gathering for members of the Lord&apos;s church who home educate
                      (e.g., Roundup). We contemplated attending it but decided instead to launch an alternative here in
                      Illinois near St. Louis. Our goal is to provide a retreat filled with fellowship, worship,
                      recreation, and encouragement for Christian families who educate their children at home.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-primary/15 bg-surface-highlight p-5 md:p-6">
                  <p className="measure-prose text-base leading-relaxed text-muted-foreground md:text-lg">
                    The first Rendezvous was in 2015 at Lake Williamson Christian Center (LWCC) in Carlinville, IL. The
                    week went smoothly and was so much fun for young and old alike! We decided to make Rendezvous an
                    annual event—always starting the first Monday in May.
                  </p>
                </div>
              </div>

              <figure className="site-sticky-top overflow-hidden rounded-xl border border-primary/15 bg-card shadow-sm lg:sticky lg:self-start">
                <img
                  src="/images/preview-202025-11-25-2022.png"
                  alt="Map showing distances between Rendezvous (Carlinville, IL), Roundup (Madill, OK), and Roundhouse (Flat Rock, NC)"
                  className="h-auto w-full"
                />
                <figcaption className="border-t border-border/60 px-4 py-3 text-center text-sm text-muted-foreground">
                  Rendezvous sits centrally for many Midwest families compared to other gatherings.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="section-sm bg-surface-tint/40">
          <div className="site-container max-w-4xl">
            <div className="mb-8 text-center md:mb-10">
              <h2 className="text-section-title mb-3 text-balance">Lake Williamson Christian Center</h2>
              <p className="measure-prose mx-auto text-muted-foreground">
                An impressive retreat facility on a lake, surrounded by a residential area, designed for groups up to
                1,500—with staff handling meals so families can focus on visiting and activities.
              </p>
            </div>

            <div className="mb-8 grid gap-4 md:grid-cols-3">
              {facilityHighlights.map(({ icon: Icon, title, text }) => (
                <article
                  key={title}
                  className="rounded-xl border border-primary/15 bg-card p-5 md:p-6"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-highlight text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 font-display text-lg font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{text}</p>
                </article>
              ))}
            </div>

            <p className="measure-prose mx-auto text-center text-sm text-muted-foreground md:text-base">
              Spend time on{" "}
              <a
                href="http://www.LakeWilliamson.org"
                target="_blank"
                rel="noreferrer noopener"
                className="focus-ring inline-flex items-center gap-1 rounded-sm font-medium text-primary hover:underline"
              >
                www.LakeWilliamson.org
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>{" "}
              for photos, recreational options, and facility details.
            </p>
          </div>
        </section>

        <section className="section-sm">
          <div className="site-container max-w-4xl">
            <p className="measure-prose mx-auto mb-8 text-center text-muted-foreground">
              If you know of others who may be interested in attending, please direct them to our website and Facebook
              group. The Facebook group is &ldquo;closed&rdquo; for privacy, but you are encouraged to invite anyone you
              think may be interested.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <a
                href="http://www.facebook.com/groups/RendezvousIL"
                target="_blank"
                rel="noreferrer noopener"
                className="focus-ring group flex min-h-[4.5rem] items-center justify-between rounded-xl border border-primary/15 bg-card p-5 transition-colors hover:border-primary/30 hover:bg-surface-tint md:p-6"
              >
                <div className="flex min-w-0 items-center gap-3 text-left">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground md:h-12 md:w-12">
                    <Users className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">Facebook group</p>
                    <p className="text-sm text-muted-foreground">Join our community</p>
                  </div>
                </div>
                <ExternalLink
                  className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
              <a
                href="http://www.LakeWilliamson.org"
                target="_blank"
                rel="noreferrer noopener"
                className="focus-ring group flex min-h-[4.5rem] items-center justify-between rounded-xl border border-primary/15 bg-card p-5 transition-colors hover:border-primary/30 hover:bg-surface-tint md:p-6"
              >
                <div className="flex min-w-0 items-center gap-3 text-left">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground md:h-12 md:w-12">
                    <Building className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">Lake Williamson</p>
                    <p className="text-sm text-muted-foreground">Explore the retreat center</p>
                  </div>
                </div>
                <ExternalLink
                  className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
            </div>
          </div>
        </section>

        <section className="section-sm border-t border-border/50 bg-card/40">
          <div className="site-container max-w-4xl">
            <figure className="mb-10 overflow-hidden rounded-xl border border-primary/15 bg-card shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/rendezvous-group-2026.jpg"
                alt="Rendezvous 2026 group photo at Lake Williamson Christian Center"
                className="h-auto w-full"
              />
              <figcaption className="border-t border-border/60 px-4 py-3 text-center text-sm text-muted-foreground">
                Last year&apos;s gathering — Rendezvous {lastGathering?.year ?? 2026}
                {lastGathering ? <> · {lastGathering.attendees} people</> : null}
              </figcaption>
            </figure>

            <div className="mb-6 flex items-center gap-3 md:mb-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground md:h-12 md:w-12">
                <Calendar className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
              </div>
              <h2 className="font-display text-section-title">Attendance history</h2>
            </div>

            <div className="space-y-3 md:hidden">
              {attendanceHistory.map((row) => (
                <article
                  key={row.year}
                  className={`rounded-xl border border-primary/15 bg-card p-4 ${
                    row.year === 2027 ? "ring-2 ring-primary/30" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-display text-amount text-primary">{row.year}</p>
                    <p className="text-sm font-medium text-primary">{row.attendees} attendees</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Theme: {row.theme}</p>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto scroll-touch-x rounded-xl border border-primary/15 md:block">
              <table className="w-full min-w-[28rem]">
                <thead>
                  <tr className="border-b bg-secondary text-secondary-foreground">
                    <th className="p-4 text-left font-semibold">Year</th>
                    <th className="p-4 text-left font-semibold">Attendees</th>
                    <th className="p-4 text-left font-semibold">Theme</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((row) => (
                    <tr
                      key={row.year}
                      className={`border-b transition-colors hover:bg-muted/50 ${
                        row.year === 2027 ? "bg-primary/5 font-semibold" : ""
                      }`}
                    >
                      <td className="p-4">{row.year}</td>
                      <td className="p-4">{row.attendees}</td>
                      <td className="p-4">{row.theme}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section-sm border-t border-primary/15 bg-surface-highlight">
          <div className="site-container max-w-4xl">
            <div className="overflow-hidden rounded-xl border border-primary/15 bg-card">
              <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div className="flex flex-col justify-center p-6 md:p-8 lg:p-10">
                  <h2 className="font-display text-section-title mb-3">Get in touch</h2>
                  <p className="mb-4 leading-relaxed text-muted-foreground">
                    If you have any questions or concerns, please contact us.
                  </p>
                  <p className="mb-6 italic text-muted-foreground">Grace &amp; peace,</p>
                  <div className="space-y-1">
                    <p className="font-handwriting text-3xl text-primary">Stephen &amp; Ranae Bradd</p>
                    <p className="text-sm font-semibold text-muted-foreground">Retreat organizers</p>
                  </div>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button asChild className="h-11">
                      <Link href="/faq">Read the FAQ</Link>
                    </Button>
                    <Button variant="outline" asChild className="h-11 border-primary/25">
                      <Link href="/registration">Registration info</Link>
                    </Button>
                  </div>
                </div>
                <div className="relative min-h-[16rem] bg-surface-tint md:min-h-0">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230901_114325-HCoWy8blcIb1Z5en7hOCTvO04ZoxJN.jpeg"
                    alt="Stephen and Ranae Bradd"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
