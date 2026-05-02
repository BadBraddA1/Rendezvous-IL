"use client"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Apple, Smartphone, Share, MoreVertical, Plus, Download, CheckCircle2, Bell } from "lucide-react"

function StepNumber({ num }: { num: number }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
      {num}
    </div>
  )
}

function IOSInstructions() {
  return (
    <Card className="border-border/50 bg-card shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
          <Apple className="h-7 w-7" />
          iPhone / iPad (Safari)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <ol className="space-y-6">
          <li className="flex gap-4">
            <StepNumber num={1} />
            <div>
              <p className="font-medium text-foreground">Open Safari</p>
              <p className="text-sm text-muted-foreground">
                Make sure you&apos;re using Safari (not Chrome or another browser). This feature only works in Safari on iOS.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <StepNumber num={2} />
            <div>
              <p className="font-medium text-foreground">Navigate to the schedule</p>
              <p className="text-sm text-muted-foreground">
                Go to <span className="font-mono text-primary">rendezvousil.com/schedule</span>
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <StepNumber num={3} />
            <div>
              <p className="font-medium text-foreground">Tap the Share button</p>
              <p className="text-sm text-muted-foreground">
                Look for the share icon at the bottom of the screen (square with an arrow pointing up).
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                <Share className="h-5 w-5 text-primary" />
                <span className="text-sm">Share</span>
              </div>
            </div>
          </li>
          <li className="flex gap-4">
            <StepNumber num={4} />
            <div>
              <p className="font-medium text-foreground">Scroll down and tap &quot;Add to Home Screen&quot;</p>
              <p className="text-sm text-muted-foreground">
                You may need to scroll down in the share menu to find this option.
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                <Plus className="h-5 w-5 text-primary" />
                <span className="text-sm">Add to Home Screen</span>
              </div>
            </div>
          </li>
          <li className="flex gap-4">
            <StepNumber num={5} />
            <div>
              <p className="font-medium text-foreground">Tap &quot;Add&quot;</p>
              <p className="text-sm text-muted-foreground">
                You can customize the name if you&apos;d like, then tap Add in the top right corner.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-green-600">Done!</p>
              <p className="text-sm text-muted-foreground">
                The Rendezvous schedule will now appear on your home screen like an app. Tap it anytime for quick access!
              </p>
            </div>
          </li>
        </ol>
      </CardContent>
    </Card>
  )
}

function AndroidInstructions() {
  return (
    <Card className="border-border/50 bg-card shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
          <Smartphone className="h-7 w-7" />
          Android (Chrome)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <ol className="space-y-6">
          <li className="flex gap-4">
            <StepNumber num={1} />
            <div>
              <p className="font-medium text-foreground">Open Chrome</p>
              <p className="text-sm text-muted-foreground">
                This works best in Google Chrome, but may also work in other browsers like Samsung Internet.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <StepNumber num={2} />
            <div>
              <p className="font-medium text-foreground">Navigate to the schedule</p>
              <p className="text-sm text-muted-foreground">
                Go to <span className="font-mono text-primary">rendezvousil.com/schedule</span>
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <StepNumber num={3} />
            <div>
              <p className="font-medium text-foreground">Tap the menu button</p>
              <p className="text-sm text-muted-foreground">
                Look for the three vertical dots in the top right corner of Chrome.
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                <MoreVertical className="h-5 w-5 text-primary" />
                <span className="text-sm">Menu</span>
              </div>
            </div>
          </li>
          <li className="flex gap-4">
            <StepNumber num={4} />
            <div>
              <p className="font-medium text-foreground">Tap &quot;Add to Home screen&quot; or &quot;Install app&quot;</p>
              <p className="text-sm text-muted-foreground">
                The wording may vary slightly depending on your Android version.
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                <Download className="h-5 w-5 text-primary" />
                <span className="text-sm">Add to Home screen</span>
              </div>
            </div>
          </li>
          <li className="flex gap-4">
            <StepNumber num={5} />
            <div>
              <p className="font-medium text-foreground">Confirm by tapping &quot;Add&quot;</p>
              <p className="text-sm text-muted-foreground">
                You can edit the name if you want, then tap Add to confirm.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-green-600">Done!</p>
              <p className="text-sm text-muted-foreground">
                The Rendezvous schedule will now appear on your home screen. Tap it anytime for instant access!
              </p>
            </div>
          </li>
        </ol>
      </CardContent>
    </Card>
  )
}

export default function InstallPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="border-b bg-secondary py-16 md:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight text-secondary-foreground md:text-5xl lg:text-6xl">
                Add to Home Screen
              </h1>
              <p className="text-balance text-lg text-secondary-foreground/70">
                Get quick access to the Rendezvous schedule right from your phone&apos;s home screen - no app store needed!
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-3xl space-y-8">
              <IOSInstructions />
              <AndroidInstructions />
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-12 md:py-16">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-4 text-center text-2xl font-bold text-foreground md:text-3xl">
                Why Add to Home Screen?
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border/50 bg-card p-5 text-center shadow-sm">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Smartphone className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-1 font-semibold">Quick Access</h3>
                  <p className="text-sm text-muted-foreground">One tap to see the schedule - no typing URLs</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card p-5 text-center shadow-sm">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Bell className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-1 font-semibold">Push Notifications</h3>
                  <p className="text-sm text-muted-foreground">Get alerts for schedule changes and announcements</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card p-5 text-center shadow-sm">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-1 font-semibold">No Download</h3>
                  <p className="text-sm text-muted-foreground">Works instantly without using storage space</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card p-5 text-center shadow-sm">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-1 font-semibold">Always Updated</h3>
                  <p className="text-sm text-muted-foreground">See real-time changes and announcements</p>
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
