import Link from "next/link"
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  HandHeart,
  MessageSquare,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { MainContent } from "@/components/main-content"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { YearHubPayload } from "@/lib/year-hub"
import { isRegistrationOpen } from "@/lib/year-hub"

function PaymentBadge({
  status,
}: {
  status: "paid_in_full" | "deposit_paid" | "payment_due" | null
}) {
  if (status === "paid_in_full") {
    return (
      <Badge className="border border-success/30 bg-surface-highlight text-success hover:bg-surface-highlight">
        <CheckCircle className="mr-1 h-3 w-3" />
        Paid in full
      </Badge>
    )
  }
  if (status === "deposit_paid") {
    return (
      <Badge variant="secondary" className="border border-warning/30 bg-surface-warm text-warning">
        <Clock className="mr-1 h-3 w-3" />
        Deposit paid
      </Badge>
    )
  }
  if (status === "payment_due") {
    return (
      <Badge variant="destructive">
        <AlertCircle className="mr-1 h-3 w-3" />
        Payment due
      </Badge>
    )
  }
  return null
}

/** Signed-in, no registration for this year — prompt to register, no year data. */
export function YearHubUnregistered({
  hub,
  firstName,
}: {
  hub: YearHubPayload
  firstName?: string | null
}) {
  const open = isRegistrationOpen() || hub.registrationOpen

  return (
    <>
      <SiteHeader />
      <MainContent belowHeader className="pb-16">
        <div className="site-container mx-auto max-w-2xl space-y-8 pt-8">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Rendezvous {hub.eventYear}
            </p>
            <h1 className="text-section-title text-balance">
              {firstName ? `Hi, ${firstName}` : "Welcome"}
            </h1>
            <p className="text-lead text-muted-foreground">
              You&apos;re signed in, but there&apos;s no {hub.eventYear} registration on this account
              yet. Register on the site to unlock your family hub for this year.
            </p>
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-widget-heading">
                <Calendar className="h-5 w-5 text-primary" />
                Register for {hub.eventYear}
              </CardTitle>
              <CardDescription>
                {open
                  ? "Registration is open — secure your family’s spot."
                  : "Registration opens January 1, 2027. You can still review details on the registration page."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full sm:w-auto">
                <Link href="/registration">
                  {open ? "Start registration" : "Registration info"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {hub.family ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-widget-heading">
                  <Users className="h-5 w-5" />
                  {hub.family.lastName} family profile
                </CardTitle>
                <CardDescription>
                  Your account is linked, but year-specific registration data stays hidden until you
                  register for {hub.eventYear}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="bg-transparent">
                  <Link href="/account/profile">
                    Manage family profile
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" asChild>
              <Link href="/about">About</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/schedule">Schedule</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/account">Account</Link>
            </Button>
          </div>
        </div>
      </MainContent>
      <SiteFooter />
    </>
  )
}

/** Signed-in with a registration for this year. */
export function YearHubRegistered({
  hub,
  firstName,
}: {
  hub: YearHubPayload
  firstName?: string | null
}) {
  const reg = hub.registration
  const family = hub.family
  const volunteering = hub.volunteering

  return (
    <>
      <SiteHeader />
      <MainContent belowHeader className="pb-16">
        <div className="site-container mx-auto max-w-3xl space-y-8 pt-8">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Rendezvous {hub.eventYear}
            </p>
            <h1 className="text-section-title text-balance">
              {firstName ? `${firstName}, you’re registered` : "You’re registered"}
            </h1>
            <p className="text-lead text-muted-foreground">
              Your {hub.eventYear} registration, family, and volunteering — all in one place.
            </p>
          </div>

          {reg ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {reg.familyLastName} family · {hub.eventYear}
                  {reg.checkedIn ? (
                    <Badge variant="outline" className="border-success/30 text-success">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Checked in
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>
                  {reg.attendeeCount != null ? `${reg.attendeeCount} attendees` : "Attendees"}
                  {reg.lodgingType ? ` · ${reg.lodgingType} lodging` : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {reg.totalCost > 0 ? (
                    <p className="text-lg font-semibold">${reg.totalCost.toFixed(2)}</p>
                  ) : null}
                  <PaymentBadge status={reg.paymentStatus} />
                </div>
                <Button variant="outline" asChild className="bg-transparent">
                  <Link href="/account">
                    Full account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {family ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Your family
                </CardTitle>
                <CardDescription>
                  {[family.city, family.state].filter(Boolean).join(", ") ||
                    family.homeCongregation ||
                    "Family roster from your profile"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {family.members.length > 0 ? (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {family.members.map((m) => (
                      <li key={m.id} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                        {m.firstName} {m.lastName}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add family members on your profile.
                  </p>
                )}
                <Button variant="outline" asChild className="bg-transparent">
                  <Link href="/account/profile">
                    Edit family profile
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HandHeart className="h-5 w-5" />
                Volunteering
              </CardTitle>
              <CardDescription>
                {volunteering?.hasContent
                  ? "Your sign-ups and assignments for this year."
                  : "You haven’t volunteered yet — we’ll recommend ways to help soon."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {volunteering?.hasContent ? (
                <ul className="space-y-2">
                  {volunteering.volunteers.map((v) => (
                    <li
                      key={v.id}
                      className="flex flex-col rounded-lg border border-border/60 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-medium">{v.volunteerName}</span>
                      <span className="text-muted-foreground">
                        {v.roleLabel || v.volunteerType}
                      </span>
                    </li>
                  ))}
                  {volunteering.specialAssignmentCount > 0 ? (
                    <li className="text-sm text-muted-foreground">
                      + {volunteering.specialAssignmentCount} special assignment
                      {volunteering.specialAssignmentCount === 1 ? "" : "s"}
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Leading a prayer, song leading, lessons, and more will show up here. Editing
                  sign-ups from the hub is coming next.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild>
              <Link href="/chat">
                <MessageSquare className="mr-2 h-4 w-4" />
                Open chat
              </Link>
            </Button>
            <Button variant="outline" asChild className="bg-transparent">
              <Link href="/schedule">View schedule</Link>
            </Button>
          </div>
        </div>
      </MainContent>
      <SiteFooter />
    </>
  )
}
