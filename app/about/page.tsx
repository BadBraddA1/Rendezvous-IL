import { ExternalLink, Users, Building, Calendar } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main id="main-content">
        <section className="border-b border-primary/15 bg-surface-highlight pt-[calc(5.5rem+env(safe-area-inset-top,0px))] pb-16 md:pt-28">
          <div className="site-container">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-page-title mb-6 text-balance text-secondary-foreground">
                About Rendezvous
              </h1>
              <p className="measure-prose mx-auto text-balance text-lead text-secondary-foreground/80">
                A Christian homeschool family retreat built on fellowship, worship, recreation, & encouragement.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="site-container max-w-4xl">
            <div className="measure-prose mx-auto space-y-8">
              <div className="rounded-xl border border-primary/15 bg-surface-highlight p-8">
                <p className="text-lg leading-relaxed">
                  Greetings brethren! Our family has enjoyed Roundhouse for 20 years now and plans to continue attending
                  indefinitely, Lord willing. We appreciate the fellowship so much and look forward to it annually,
                  despite the lengthy drive. We became aware of an alternative gathering for members of the Lord's
                  church who home educate (e.g., Roundup). We contemplated attending it but decided instead to launch an
                  alternative here in Illinois near St. Louis. {/* Updated to "5 Days / 4 Nights" */}Our goal is to
                  provide a 5 Days / 4 Nights retreat filled with fellowship, worship, recreation, and encouragement for
                  Christian families who educate their children at home.
                </p>
              </div>

              <div className="my-12 overflow-hidden rounded-xl border bg-card shadow-sm">
                <img
                  src="/images/preview-202025-11-25-2022.png"
                  alt="Map showing distances between Rendezvous (Carlinville, IL), Roundup (Madill, OK), and Roundhouse (Flat Rock, NC)"
                  className="w-full h-auto"
                />
              </div>

              <p className="text-lg leading-relaxed text-muted-foreground">
                The first Rendezvous was in 2015 at Lake Williamson Christian Center (LWCC) in Carlinville, IL. The week
                went smoothly & was so much fun for young and old alike! We decided to make Rendezvous an annual event
                (always starting the first Monday in May).
              </p>

              <p className="text-lg leading-relaxed text-muted-foreground">
                The LWCC facility is quite impressive. Let me encourage you to spend some time on their website:{" "}
                <a
                  href="http://www.LakeWilliamson.org"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="focus-ring inline-flex items-center gap-1 rounded-sm font-medium text-primary transition-colors hover:underline"
                >
                  www.LakeWilliamson.org
                  <ExternalLink className="h-4 w-4" />
                </a>{" "}
                to see pictures, recreational options, etc. The facility has a lake and is surrounded by a residential
                area. It has a ton of recreational options (e.g., archery, mini golf, black-light dodgeball, nine
                square, basketball, volleyball, wallyball, obstacle course, rock climbing wall, indoor pool, kickball,
                softball, disc golf, canoeing, ping pong, billiards, zip line, and more!) and can accommodate groups of
                1500 people. LWCC is designed as a retreat center and they do all the cooking. They have a nice dining
                hall that can seat 500 people at one time. The meals are all buffet style (a couple entrees and sides
                are offered with each meal, along with a full salad bar, desserts, and drinks). Not having to prepare
                meals or clean-up afterward is a real treat; it simplifies things and allows more time for visiting and
                activities. There are several lodging options: motel, RV, or tent camping. Each motel room can sleep up
                to 6 people (either 2 queen beds plus 1 bunk bed or 1 queen bed plus 2 bunk beds—your choice). The motel
                rooms are basic but provide all linens and a private bathroom. The RVers & tent campers use the shower
                rooms at the indoor pool as needed (about 100 yards away).
              </p>

              <p className="text-lg leading-relaxed text-muted-foreground">
                If you need to do laundry while there, there are washers and dryers available.
              </p>

              <p className="text-lg leading-relaxed text-muted-foreground">
                If you know of others who may be interested in attending, please direct them to our website and Facebook
                group. The Facebook group is "closed" for privacy, but you are encouraged to invite and add anyone to it
                you think may be interested.
              </p>

              <div className="my-12 grid gap-4 sm:grid-cols-2">
                <a
                  href="http://www.facebook.com/groups/RendezvousIL"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="focus-ring group flex min-h-[4.5rem] items-center justify-between rounded-xl border border-primary/15 bg-card p-6 transition-colors hover:border-primary/30 hover:bg-surface-tint"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <Users className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-semibold">Facebook group</p>
                      <p className="text-sm text-muted-foreground">Join our community</p>
                    </div>
                  </div>
                  <ExternalLink className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </a>
                <a
                  href="http://www.LakeWilliamson.org"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="focus-ring group flex min-h-[4.5rem] items-center justify-between rounded-xl border border-primary/15 bg-card p-6 transition-colors hover:border-primary/30 hover:bg-surface-tint"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Building className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-semibold">Lake Williamson</p>
                      <p className="text-sm text-muted-foreground">Explore the retreat center</p>
                    </div>
                  </div>
                  <ExternalLink className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </a>
              </div>

              <div className="my-12">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <h2 className="font-display text-section-title">Attendance history</h2>
                </div>
                <div className="-mx-4 overflow-x-auto rounded-xl border border-primary/15 sm:mx-0">
                  <table className="w-full min-w-[28rem]">
                    <thead>
                      <tr className="border-b bg-secondary text-secondary-foreground">
                        <th className="p-4 text-left font-semibold">Year</th>
                        <th className="p-4 text-left font-semibold">Attendees</th>
                        <th className="p-4 text-left font-semibold">Theme</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { year: 2015, attendees: 50, theme: "Matthew" },
                        { year: 2016, attendees: 52, theme: "John" },
                        { year: 2017, attendees: 63, theme: "Acts" },
                        { year: 2018, attendees: 92, theme: "Genesis" },
                        { year: 2019, attendees: 73, theme: "Exodus" },
                        { year: 2020, attendees: 82, theme: "Lev, Num, & Deut" },
                        { year: 2021, attendees: 129, theme: "Romans" },
                        { year: 2022, attendees: 138, theme: "1 Corinthians" },
                        { year: 2023, attendees: 174, theme: "2 Corinthians" },
                        { year: 2024, attendees: 124, theme: "Joshua" },
                        { year: 2025, attendees: 118, theme: "Judges" },
                        { year: 2026, attendees: 136, theme: "Galatians & Ephesians" },
                        { year: 2027, attendees: "?", theme: "1 Samuel" },
                      ].map((row, idx) => (
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

              <div className="my-12 rounded-xl border border-primary/15 bg-surface-tint p-8">
                <h2 className="font-display mb-6 text-2xl font-bold">Get in touch</h2>
                <p className="mb-6 leading-relaxed text-muted-foreground">
                  If you have any questions or concerns, please contact us.
                </p>
                <p className="mb-6 italic text-muted-foreground">Grace & peace,</p>
                <div className="mb-6 flex justify-center">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230901_114325-HCoWy8blcIb1Z5en7hOCTvO04ZoxJN.jpeg"
                    alt="Stephen and Ranae Bradd"
                    className="h-64 w-auto rounded-lg object-cover shadow-md"
                  />
                </div>
                <div className="space-y-2 text-center">
                  <p className="font-handwriting text-3xl text-primary">Stephen & Ranae Bradd</p>
                  <p className="text-sm font-semibold text-muted-foreground"> Retreat Organizers</p>
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
