import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { MainContent } from "@/components/main-content"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "lucide-react"

export const metadata = {
  title: "Get the App | Rendezvous IL",
  description:
    "Download the Rendezvous IL app for iPhone and iPad. Android is still in the works.",
}

function AppStoreBadge({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring inline-flex min-h-11 items-center justify-center gap-3 rounded-lg bg-foreground px-5 py-3 text-background transition-opacity hover:opacity-90"
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
      className="inline-flex min-h-11 items-center justify-center gap-3 rounded-lg border border-border bg-muted/40 px-5 py-3 text-muted-foreground"
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

export default function InstallPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <MainContent className="site-below-header-loose">
        <section className="site-page-intro border-b bg-secondary pb-16 md:pb-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-page-title mb-4 text-balance text-secondary-foreground">
                Get the Rendezvous IL app
              </h1>
              <p className="text-balance text-lg text-secondary-foreground/70">
                Schedule, chat, directory, and check-in for retreat week — on your phone.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container mx-auto px-6">
            <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
              <Card className="border-border/50 bg-card">
                <CardHeader className="border-b border-border/50 bg-surface-tint">
                  <CardTitle className="flex items-center gap-3 text-subheading">
                    <Apple className="h-6 w-6" aria-hidden="true" />
                    iPhone &amp; iPad
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 p-6">
                  <p className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Live on the App Store
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Free to download. Sign in with the same account you use on
                    rendezvousil.com.
                  </p>
                  <AppStoreBadge href={IOS_APP_STORE_URL} />
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card">
                <CardHeader className="border-b border-border/50 bg-surface-tint">
                  <CardTitle className="flex items-center gap-3 text-subheading">
                    <Smartphone className="h-6 w-6" aria-hidden="true" />
                    Android
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 p-6">
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
                </CardContent>
              </Card>
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
