import Link from "next/link"
import { ArrowRight, Calendar, MapPin, Users } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { MainContent } from "@/components/main-content"
import { Button } from "@/components/ui/button"
import { RegistrationCountdown2027 } from "@/components/registration-countdown-2027"
import { DEFAULT_REGISTRATION_EVENT_YEAR } from "@/lib/registration-event-years"
import { isRegistrationOpen } from "@/lib/year-hub"

const year = DEFAULT_REGISTRATION_EVENT_YEAR

/** Signed-out compact year entry — countdown / register / sign-in; marketing lives on About. */
export function YearHubGuest() {
  const open = isRegistrationOpen()

  return (
    <>
      <SiteHeader isHomepage />
      <MainContent belowHeader>
        <section className="section border-b border-primary/10 bg-surface-highlight">
          <div className="site-container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
                Rendezvous {year}
              </p>
              <h1 className="text-section-title mb-4 text-balance">Your family retreat year</h1>
              <p className="mb-8 text-lead text-muted-foreground">
                May 3–7 at Lake Williamson. Sign in to see your registration, or register when
                doors open.
              </p>
              <div className="mb-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button size="lg" className="h-12 w-full min-w-[10rem] sm:w-auto" asChild>
                  <Link href="/sign-in?redirect_url=/">
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                {open ? (
                  <Button size="lg" variant="outline" className="h-12 w-full bg-transparent sm:w-auto" asChild>
                    <Link href="/registration">Register for {year}</Link>
                  </Button>
                ) : (
                  <Button size="lg" variant="outline" className="h-12 w-full bg-transparent sm:w-auto" asChild>
                    <Link href="/about">About the retreat</Link>
                  </Button>
                )}
              </div>
              <ul className="mx-auto grid max-w-lg gap-4 text-left sm:grid-cols-3">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  May 3–7, {year}
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Carlinville, IL
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  All ages welcome
                </li>
              </ul>
            </div>
          </div>
        </section>
        <RegistrationCountdown2027 />
        <section className="section">
          <div className="site-container">
            <div className="mx-auto flex max-w-xl flex-col gap-3 text-center sm:flex-row sm:justify-center">
              <Button variant="ghost" asChild>
                <Link href="/schedule">Schedule</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/about">About</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/faq">FAQ</Link>
              </Button>
            </div>
          </div>
        </section>
      </MainContent>
      <SiteFooter />
    </>
  )
}
