import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { MainContent } from "@/components/main-content"
import { Button } from "@/components/ui/button"
import { DEFAULT_REGISTRATION_EVENT_YEAR } from "@/lib/registration-event-years"
import { isRegistrationOpen } from "@/lib/registration-open"

const year = DEFAULT_REGISTRATION_EVENT_YEAR

/** Below-fold countdown — keep out of the guest hero JS critical path. */
const RegistrationCountdown2027 = dynamic(
  () =>
    import("@/components/registration-countdown-2027").then(
      (m) => m.RegistrationCountdown2027,
    ),
  {
    loading: () => (
      <section
        className="section-sm border-y border-primary/20 bg-surface-lake"
        aria-busy="true"
        aria-label="Loading registration countdown"
      >
        <div className="site-container">
          <div className="mx-auto h-40 max-w-2xl animate-pulse rounded-xl bg-primary/10" />
        </div>
      </section>
    ),
  },
)

/**
 * Signed-out season entry — logo, week, one primary path.
 * Nav for Schedule / FAQ / About lives in the header; long-form on /about.
 */
export function YearHubGuest() {
  const open = isRegistrationOpen()

  return (
    <>
      <SiteHeader isHomepage />
      <MainContent belowHeader="loose">
        <section
          className="hero-lake-bg hero-viewport relative flex min-h-[calc(100dvh-var(--site-header-offset))] flex-col items-center justify-center [contain:layout]"
          aria-labelledby="year-hub-guest-heading"
        >
          <div className="site-container relative z-10 flex w-full flex-col items-center py-8 text-center md:py-12">
            <div className="mb-8 w-full max-w-[min(100%,420px)] md:max-w-[520px]">
              <Image
                src="/rendezvous-logo-home.webp"
                alt="Rendezvous — Christian Homeschool Family Retreat"
                width={1040}
                height={624}
                sizes="(max-width: 640px) 90vw, 520px"
                className="mx-auto h-auto w-full"
                priority
              />
            </div>

            <h1 id="year-hub-guest-heading" className="hero-year mb-3 text-balance text-primary">
              <span className="sr-only">Rendezvous </span>
              {year}
            </h1>

            <p className="mb-2 text-lead font-medium text-brand-coral-ink">Theme: 1 Samuel</p>
            <p className="mb-10 measure mx-auto max-w-md text-pretty text-base text-foreground md:text-lg">
              May 3–7 at Lake Williamson, Carlinville, IL.
            </p>

            <div className="flex w-full max-w-md flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
              {open ? (
                <Button size="lg" className="h-14 w-full min-w-0 px-10 text-base font-medium sm:w-auto" asChild>
                  <Link href="/registration" prefetch>
                    Register for {year}
                    <ArrowRight className="ms-2 h-5 w-5 shrink-0" aria-hidden />
                  </Link>
                </Button>
              ) : (
                <Button size="lg" className="h-14 w-full min-w-0 px-10 text-base font-medium sm:w-auto" asChild>
                  <Link href="/about" prefetch>
                    About the retreat
                    <ArrowRight className="ms-2 h-5 w-5 shrink-0" aria-hidden />
                  </Link>
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                className="h-14 w-full min-w-0 border-primary/25 bg-transparent px-10 text-base font-medium text-foreground hover:bg-surface-highlight sm:w-auto"
                asChild
              >
                <Link href="/sign-in?redirect_url=/">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>

        {!open ? <RegistrationCountdown2027 /> : null}
      </MainContent>
      <SiteFooter />
    </>
  )
}
