import Link from "next/link"
import { ExternalLink, Users, Building, Calendar, Calculator, CheckCircle2, Clock, DollarSign } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="border-b bg-secondary py-16">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="mb-6 text-balance text-5xl font-bold tracking-tight text-secondary-foreground md:text-6xl">
                About Rendezvous
              </h1>
              <p className="text-balance text-lg text-secondary-foreground/70">
                A Christian homeschool family retreat built on fellowship, worship, recreation, &amp; encouragement.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto max-w-4xl px-6">
            <div className="prose prose-lg max-w-none space-y-8 leading-relaxed">

              {/* Origin Story */}
              <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-accent/5 p-8">
                <p className="text-lg leading-relaxed">
                  Greetings brethren! Our family has enjoyed Roundhouse for 20 years now and plans to continue attending
                  indefinitely, Lord willing. We appreciate the fellowship so much and look forward to it annually,
                  despite the lengthy drive. We became aware of an alternative gathering for members of the Lord&apos;s
                  church who home educate (e.g., Roundup). We contemplated attending it but decided instead to launch an
                  alternative here in Illinois near St. Louis. Our goal is to provide a 5 Days / 4 Nights retreat filled
                  with fellowship, worship, recreation, and encouragement for Christian families who educate their
                  children at home.
                </p>
              </div>

              {/* Map */}
              <div className="my-12 overflow-hidden rounded-xl border bg-card shadow-sm">
                <img
                  src="/images/preview-202025-11-25-2022.png"
                  alt="Map showing distances between Rendezvous (Carlinville, IL), Roundup (Madill, OK), and Roundhouse (Flat Rock, NC)"
                  className="w-full h-auto"
                />
              </div>

              <p className="text-lg leading-relaxed text-muted-foreground">
                The first Rendezvous was in 2015 at Lake Williamson Christian Center (LWCC) in Carlinville, IL. The week
                went smoothly &amp; was so much fun for young and old alike! We decided to make Rendezvous an annual event
                (always starting the first Monday in May).
              </p>

              <p className="text-lg leading-relaxed text-muted-foreground">
                The LWCC facility is quite impressive. Let me encourage you to spend some time on their website:{" "}
                <a
                  href="http://www.LakeWilliamson.org"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 font-medium text-primary transition-colors hover:underline"
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
                to 6 people (either 2 queen beds plus 1 bunk bed or 1 queen bed plus 2 bunk beds&mdash;your choice). The motel
                rooms are basic but provide all linens and a private bathroom. The RVers &amp; tent campers use the shower
                rooms at the indoor pool as needed (about 100 yards away).
              </p>

              <p className="text-lg leading-relaxed text-muted-foreground">
                If you need to do laundry while there, there are washers and dryers available.
              </p>

              <p className="text-lg leading-relaxed text-muted-foreground">
                If you know of others who may be interested in attending, please direct them to our website and Facebook
                group. The Facebook group is &ldquo;closed&rdquo; for privacy, but you are encouraged to invite and add anyone to it
                you think may be interested.
              </p>

              {/* How Registration Works */}
              <div className="my-12">
                <h2 className="mb-2 text-3xl font-bold">How Registration Works</h2>
                <p className="mb-8 text-muted-foreground leading-relaxed">
                  Registration for Rendezvous opens each year in the fall for the following May event. Here is a typical
                  timeline of how it works:
                </p>

                {/* Timeline */}
                <div className="relative space-y-0">
                  {[
                    {
                      icon: Clock,
                      color: "bg-primary",
                      title: "Registration Opens",
                      timing: "Fall (typically October–November)",
                      description:
                        "Registration opens several months before the event. An announcement goes out via the website and Facebook group.",
                    },
                    {
                      icon: DollarSign,
                      color: "bg-chart-4",
                      title: "Discounted Registration Period",
                      timing: "Through early March",
                      description:
                        "Families who register early receive a discounted registration fee. This is the best time to lock in your spot and save money.",
                    },
                    {
                      icon: CheckCircle2,
                      color: "bg-chart-2",
                      title: "Regular Registration Period",
                      timing: "Early March through mid-April",
                      description:
                        "Registration remains open at the standard fee. Lodging assignments are made on a first-come, first-served basis, so earlier is better for motel room availability.",
                    },
                    {
                      icon: Calendar,
                      color: "bg-destructive",
                      title: "Registration Closes",
                      timing: "Mid-April (typically April 15)",
                      description:
                        "Registration closes approximately two weeks before the event begins. No registrations are accepted after the deadline.",
                    },
                    {
                      icon: Users,
                      color: "bg-secondary",
                      title: "Event Weekend",
                      timing: "First Monday in May · 5 Days / 4 Nights",
                      description:
                        "Rendezvous kicks off! Check-in begins Monday afternoon and the event runs through Friday.",
                    },
                  ].map((step, i, arr) => (
                    <div key={step.title} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${step.color}`}
                        >
                          <step.icon className="h-5 w-5" />
                        </div>
                        {i < arr.length - 1 && (
                          <div className="my-1 w-0.5 flex-1 bg-border" />
                        )}
                      </div>
                      <div className={`pb-8 ${i === arr.length - 1 ? "pb-0" : ""}`}>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                          {step.timing}
                        </p>
                        <h3 className="font-semibold text-base mb-1">{step.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calculator CTA */}
                <div className="mt-10 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6 flex flex-col sm:flex-row items-center gap-6">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Calculator className="h-7 w-7" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-lg mb-1">Estimate Your Cost</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Wondering what Rendezvous will cost for your family? Use our Cost Calculator to get an estimate
                      based on your family size, ages, and lodging choice.
                    </p>
                  </div>
                  <Button size="lg" className="shrink-0" asChild>
                    <Link href="/calculator">
                      <Calculator className="mr-2 h-4 w-4" />
                      Open Calculator
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Links */}
              <div className="my-12 grid gap-4 md:grid-cols-2">
                <a
                  href="http://www.facebook.com/groups/RendezvousIL"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group rounded-xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-6 transition-all hover:border-accent/40 hover:shadow-lg text-center"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Facebook Group</p>
                      <p className="text-sm text-muted-foreground">Join our community</p>
                    </div>
                  </div>
                  <ExternalLink className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
                </a>

                <a
                  href="http://www.LakeWilliamson.org"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6 transition-all hover:border-primary/40 hover:shadow-lg text-center"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Building className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Lake Williamson Christian Center</p>
                      <p className="text-sm text-muted-foreground">View the venue</p>
                    </div>
                  </div>
                  <ExternalLink className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
                </a>
              </div>

              {/* Attendance History */}
              <div className="my-12">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <h2 className="text-3xl font-bold">Attendance History</h2>
                </div>
                <div className="overflow-hidden rounded-xl border">
                  <table className="w-full">
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
                        { year: 2026, attendees: "?", theme: "Galatians & Ephesians" },
                      ].map((row) => (
                        <tr
                          key={row.year}
                          className={`border-b transition-colors hover:bg-muted/50 ${
                            row.year === 2026 ? "bg-primary/5 font-semibold" : ""
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

              {/* Contact */}
              <div className="my-12 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-8">
                <h2 className="mb-6 text-2xl font-bold">Get in Touch</h2>
                <p className="mb-6 leading-relaxed text-muted-foreground">
                  If you have any questions or concerns, please contact us.
                </p>
                <p className="mb-6 italic text-muted-foreground">Grace &amp; peace,</p>
                <div className="mb-6 flex justify-center">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20230901_114325-HCoWy8blcIb1Z5en7hOCTvO04ZoxJN.jpeg"
                    alt="Stephen and Ranae Bradd"
                    className="h-64 w-auto rounded-lg object-cover shadow-md"
                  />
                </div>
                <div className="space-y-2 text-center">
                  <p className="font-handwriting text-3xl text-primary">Stephen &amp; Ranae Bradd</p>
                  <p className="text-sm font-semibold text-muted-foreground">Retreat Organizers</p>
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
