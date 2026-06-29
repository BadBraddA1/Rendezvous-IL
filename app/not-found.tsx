import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { BookOpen, Calendar, Home, MapPin, MessageCircleQuestion } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Page not found | Rendezvous 2027",
  description:
    "This page is not on the Rendezvous 2027 site map. Return home, view the schedule, or learn about Bible Bowl at Lake Williamson.",
  robots: { index: false, follow: true },
}

const helpfulLinks = [
  { href: "/schedule", label: "Event schedule", icon: Calendar },
  { href: "/about", label: "About Rendezvous", icon: MapPin },
  { href: "/biblebowl", label: "Bible Bowl (1 Samuel)", icon: BookOpen },
  { href: "/faq", label: "FAQ", icon: MessageCircleQuestion },
] as const

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main
        id="main-content"
        className="site-container site-below-header-loose site-page-intro flex min-h-[calc(100dvh-var(--site-header-offset)-12rem)] flex-col items-center justify-center pb-16 md:pb-20"
      >
        <div className="mx-auto w-full max-w-xl text-center">
          <Image
            src="/rendezvous-logo.png"
            alt="Rendezvous — Christian homeschool family retreat"
            width={220}
            height={74}
            className="mx-auto mb-8 h-auto w-[min(100%,200px)] md:w-[220px]"
            priority
          />

          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Off the map
          </p>

          <h1 className="hero-year mt-3 text-balance text-primary">
            <span className="sr-only">Error </span>404
          </h1>

          <p className="text-section-title mt-4 text-balance text-foreground">
            This page isn&apos;t at camp
          </p>

          <p className="measure mx-auto mt-4 text-pretty text-muted-foreground">
            The link may be old, mistyped, or from a past year. Rendezvous 2027 is May 3–7 at Lake
            Williamson — here are a few places families usually head next.
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="h-11 min-h-11">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" aria-hidden />
                Back to home
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 min-h-11 border-primary/25">
              <Link href="/schedule">View schedule</Link>
            </Button>
          </div>

          <div className="mt-10 rounded-2xl border border-primary/15 bg-surface-lake p-6 text-left shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Popular pages
            </p>
            <ul className="mt-4 space-y-3">
              {helpfulLinks.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-sm font-medium text-primary hover:underline"
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-muted-foreground">
              Questions?{" "}
              <a
                href="mailto:Stephen@Bradd.us"
                className="focus-ring rounded-sm font-medium text-primary hover:underline"
              >
                Email Stephen
              </a>
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
