import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { MainContent } from "@/components/main-content"
import { Button } from "@/components/ui/button"
import {
  IOS_APP_STORE_URL,
  ANDROID_APP_LIVE,
  ANDROID_PLAY_STORE_URL,
} from "@/lib/native-app-store"
import {
  Apple,
  Smartphone,
  Calendar,
  MessageSquare,
  Users,
  Bell,
  CheckCircle2,
  QrCode,
} from "lucide-react"

export const metadata = {
  title: "Get the App | Rendezvous IL",
  description:
    "Download the Rendezvous IL app for iPhone and iPad. Android is still in the works. Or open /app on your phone for a direct store link.",
}

function AppStoreBadge({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-foreground px-5 py-3.5 text-background transition-opacity hover:opacity-90"
      aria-label="Download on the App Store"
    >
      <Apple className="h-7 w-7 shrink-0" aria-hidden="true" />
      <span className="text-left leading-tight">
        <span className="block text-[10px] font-medium uppercase tracking-wide opacity-80">
          Download on the
        </span>
        <span className="block text-lg font-semibold">App Store</span>
      </span>
    </a>
  )
}

function AndroidComingSoon() {
  return (
    <div
      className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg border border-border bg-muted/40 px-5 py-3.5 text-muted-foreground"
      aria-label="Android app still in the works"
    >
      <Smartphone className="h-7 w-7 shrink-0" aria-hidden="true" />
      <span className="text-left leading-tight">
        <span className="block text-[10px] font-medium uppercase tracking-wide">
          Google Play
        </span>
        <span className="block text-lg font-semibold text-foreground">Still in the works</span>
      </span>
    </div>
  )
}

const highlights = [
  {
    title: "Live schedule",
    description: "Today’s events, meals, and reminders — always up to date.",
    icon: Calendar,
  },
  {
    title: "Year chat",
    description: "Message your event year with photos, polls, and reactions.",
    icon: MessageSquare,
  },
  {
    title: "Family directory",
    description: "Find other families and keep your card current.",
    icon: Users,
  },
  {
    title: "Push updates",
    description: "Announcements and chat alerts while you’re on campus.",
    icon: Bell,
  },
]

export default function GetTheAppPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <MainContent className="site-below-header-loose">
        <section className="relative overflow-hidden border-b bg-secondary pb-16 md:pb-20">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in oklch, var(--primary) 35%, transparent), transparent 70%)",
            }}
            aria-hidden="true"
          />
          <div className="container relative mx-auto px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-secondary-foreground/65">
                Rendezvous IL
              </p>
              <h1 className="text-page-title mb-4 text-balance text-secondary-foreground">
                Get the app
              </h1>
              <p className="text-balance text-lg text-secondary-foreground/70">
                Schedule, chat, directory, and check-in for retreat week — on your phone.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container mx-auto px-6">
            <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-6">
                  <div className="flex items-center gap-3">
                    <Apple className="h-6 w-6" aria-hidden="true" />
                    <h2 className="text-subheading">iPhone &amp; iPad</h2>
                  </div>
                  <p className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Live on the App Store
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Free to download. Sign in with the same account you use on
                    rendezvousil.com.
                  </p>
                  <AppStoreBadge href={IOS_APP_STORE_URL} />
                </div>

                <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-6">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-6 w-6" aria-hidden="true" />
                    <h2 className="text-subheading">Android</h2>
                  </div>
                  <p className="text-sm font-medium text-brand-coral-ink">Still in the works</p>
                  <p className="text-sm text-muted-foreground">
                    The Android app is under active development. Until it ships,
                    use the website on your phone for schedule, registration, and
                    account tools.
                  </p>
                  {ANDROID_APP_LIVE && ANDROID_PLAY_STORE_URL ? (
                    <Button asChild size="lg" className="min-h-11 w-fit">
                      <a href={ANDROID_PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                        Get it on Google Play
                      </a>
                    </Button>
                  ) : (
                    <AndroidComingSoon />
                  )}
                </div>
              </div>

              <aside className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border/60 bg-muted/25 p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <QrCode className="h-7 w-7 text-primary" aria-hidden="true" />
                </div>
                <h2 className="text-subheading">On your phone?</h2>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Open{" "}
                  <Link href="/app" className="font-semibold text-foreground underline-offset-4 hover:underline">
                    rendezvousil.com/app
                  </Link>{" "}
                  — we send you straight to the right store.
                </p>
                <Button asChild size="lg" className="min-h-11">
                  <Link href="/app">Open store link</Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Also works as <span className="font-medium text-foreground">/gettheapp</span>
                </p>
              </aside>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-12 md:py-16">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-section-title mb-8 text-balance text-center">
                What’s in the app
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {highlights.map(({ title, description, icon: Icon }) => (
                  <div key={title} className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold">{title}</h3>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="mb-4 text-muted-foreground">
                Prefer the browser? The full site works on any phone.
              </p>
              <Button asChild variant="outline" size="lg" className="min-h-11">
                <Link href="/schedule">View schedule on the web</Link>
              </Button>
            </div>
          </div>
        </section>
      </MainContent>

      <SiteFooter />
    </div>
  )
}
