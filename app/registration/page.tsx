import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarX, Calendar, Users, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function RegistrationPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          {/* Registration Closed Card */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <CalendarX className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-3xl md:text-4xl">Registration is Closed</CardTitle>
              <CardDescription className="text-lg mt-2">
                Thank you for your interest in Rendezvous 2026!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-muted/50 p-6 text-center">
                <p className="text-muted-foreground">
                  Registration for the 2026 Rendezvous Homeschool Family Retreat has closed. 
                  We are excited to welcome all registered families to this year&apos;s event!
                </p>
              </div>

              {/* Event Details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
                  <Calendar className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">Event Dates</p>
                    <p className="text-sm text-muted-foreground">May 4-8, 2026</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
                  <Users className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">Already Registered?</p>
                    <p className="text-sm text-muted-foreground">See you there!</p>
                  </div>
                </div>
              </div>

              {/* Info for registered families */}
              <div className="rounded-lg border bg-card p-6">
                <h3 className="font-semibold mb-2">For Registered Families</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Check out the schedule and prepare for an amazing week of fellowship, 
                  activities, and spiritual growth with your homeschool community.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href="/schedule">View Schedule</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/faq">View FAQ</Link>
                  </Button>
                </div>
              </div>

              {/* Questions */}
              <div className="rounded-lg border-dashed border-2 border-muted-foreground/20 p-6 text-center">
                <h3 className="font-semibold mb-2">Have Questions?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Join our Facebook group to stay connected and get updates about the event.
                </p>
                <Button variant="secondary" asChild>
                  <a 
                    href="https://www.facebook.com/groups/RendezvousIL" 
                    target="_blank" 
                    rel="noreferrer noopener"
                  >
                    Join Facebook Group
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
