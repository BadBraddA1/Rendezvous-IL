import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { MainContent } from "@/components/main-content"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { YearHubPayload } from "@/lib/year-hub"
import { isRegistrationOpen } from "@/lib/registration-open"
import { StealthCheckInMark } from "@/components/year-hub/stealth-checkin-mark"

function formatUsd(amount: number) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}

function displayName(value: string | null | undefined, fallback = "") {
  const trimmed = value?.trim()
  if (!trimmed) return fallback
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed
}

function PaymentBadge({
  status,
}: {
  status: "paid_in_full" | "deposit_paid" | "payment_due" | null
}) {
  if (status === "paid_in_full") {
    return (
      <Badge className="border border-success/30 bg-surface-highlight text-success hover:bg-surface-highlight">
        <CheckCircle className="me-1 h-3 w-3" aria-hidden />
        Paid in full
      </Badge>
    )
  }
  if (status === "deposit_paid") {
    return (
      <Badge variant="secondary" className="border border-warning/30 bg-surface-warm text-warning">
        <Clock className="me-1 h-3 w-3" aria-hidden />
        Deposit paid
      </Badge>
    )
  }
  if (status === "payment_due") {
    return (
      <Badge variant="destructive">
        <AlertCircle className="me-1 h-3 w-3" aria-hidden />
        Payment due
      </Badge>
    )
  }
  return null
}

/** Signed-in, no registration for this year — one register path. */
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
          <div className="space-y-3">
            <h1 className="text-section-title break-words text-balance">
              {firstName?.trim() ? `Hi, ${displayName(firstName)}` : "Welcome"}
            </h1>
            <p className="text-lead text-muted-foreground text-pretty">
              No {hub.eventYear} registration on this account yet.
            </p>
          </div>

          <div className="rounded-xl border border-primary/25 bg-surface-lake p-6">
            <p className="mb-4 text-sm text-on-surface text-pretty">
              {open
                ? "Registration is open — secure your family’s spot."
                : "Registration opens January 1, 2027."}
            </p>
            <Button size="lg" asChild className="h-14 w-full sm:w-auto">
              <Link href="/registration">
                {open ? "Start registration" : "Registration info"}
                <ArrowRight className="ms-2 h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </Button>
          </div>

          {hub.family ? (
            <p className="text-sm text-muted-foreground">
              <Link
                href="/account/profile"
                className="focus-ring rounded-sm font-medium text-accent underline-offset-2 hover:underline"
              >
                Manage {displayName(hub.family.lastName, "family")} family profile
              </Link>
            </p>
          ) : null}
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
        <div className="site-container mx-auto max-w-3xl pt-8">
          <header className="mb-10">
            <h1 className="text-section-title break-words text-balance">
              {firstName?.trim()
                ? `${displayName(firstName)}, you’re registered`
                : "You’re registered"}
            </h1>
          </header>

          {reg?.checkinQrCode ? (
            <div className="mb-10">
              <StealthCheckInMark code={reg.checkinQrCode} familyLastName={reg.familyLastName} />
            </div>
          ) : null}

          {reg ? (
            <section
              className="mb-10 flex flex-col gap-4 border-b border-border/60 pb-10 sm:flex-row sm:items-end sm:justify-between"
              aria-labelledby="year-hub-registration-heading"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="year-hub-registration-heading" className="text-widget-heading break-words">
                    {displayName(reg.familyLastName, "Your")} family · {hub.eventYear}
                  </h2>
                  {reg.checkedIn ? (
                    <Badge variant="outline" className="border-success/30 text-success">
                      <CheckCircle className="me-1 h-3 w-3" aria-hidden />
                      Checked in
                    </Badge>
                  ) : null}
                </div>
                {reg.attendeeCount != null || reg.lodgingType ? (
                  <p className="break-words text-sm text-muted-foreground">
                    {reg.attendeeCount != null ? `${reg.attendeeCount} attendees` : null}
                    {reg.attendeeCount != null && reg.lodgingType ? " · " : null}
                    {reg.lodgingType ? `${reg.lodgingType} lodging` : null}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {reg.totalCost > 0 ? (
                    <p className="text-lg font-semibold tabular-nums">{formatUsd(reg.totalCost)}</p>
                  ) : null}
                  <PaymentBadge status={reg.paymentStatus} />
                </div>
              </div>
              <Button variant="outline" asChild className="min-h-11 shrink-0 bg-transparent hover:bg-surface-highlight">
                <Link href="/account">
                  Account
                  <ArrowRight className="ms-2 h-4 w-4 shrink-0" aria-hidden />
                </Link>
              </Button>
            </section>
          ) : null}

          {family ? (
            <section className="mb-10 border-b border-border/60 pb-10" aria-labelledby="year-hub-family-heading">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="year-hub-family-heading" className="text-widget-heading">
                  Family
                </h2>
                <Link
                  href="/account/profile"
                  className="focus-ring min-h-11 rounded-lg px-1 py-2 text-sm font-medium text-accent underline-offset-2 hover:underline"
                >
                  Edit
                </Link>
              </div>
              {family.members.length > 0 ? (
                <ul className="grid gap-1 sm:grid-cols-2">
                  {family.members.map((m) => (
                    <li key={m.id} className="min-w-0 break-words py-1 text-sm">
                      {displayName(`${m.firstName} ${m.lastName}`.trim(), "Family member")}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <Link
                    href="/account/profile"
                    className="focus-ring rounded-sm font-medium text-accent underline-offset-2 hover:underline"
                  >
                    Add family members
                  </Link>
                </p>
              )}
            </section>
          ) : null}

          <section className="mb-10" aria-labelledby="year-hub-volunteering-heading">
            <h2 id="year-hub-volunteering-heading" className="text-widget-heading mb-4">
              Volunteering
            </h2>
            <div className="space-y-3">
              {volunteering?.nextUp ? (
                <div className="rounded-xl border border-primary/25 bg-surface-lake p-4">
                  <p className="text-base font-semibold text-balance break-words text-on-surface">
                    <span className="text-accent">
                      {displayName(volunteering.nextUp.personName, "Someone")}
                    </span>
                    {" · "}
                    {displayName(volunteering.nextUp.eventLabel, "Assignment")}
                  </p>
                  <p className="mt-1 break-words text-sm text-on-surface">
                    {volunteering.nextUp.whenLabel}
                  </p>
                </div>
              ) : null}
              {volunteering?.hasContent ? (
                <ul className="divide-y divide-border/50">
                  {volunteering.volunteers.map((v) => (
                    <li
                      key={v.id}
                      className="flex min-w-0 flex-col gap-0.5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <span className="min-w-0 break-words font-medium">
                        {displayName(v.volunteerName, "Volunteer")}
                      </span>
                      <span className="min-w-0 break-words text-muted-foreground sm:text-end">
                        {displayName(v.roleLabel || v.volunteerType, "Role")}
                      </span>
                    </li>
                  ))}
                  {volunteering.specialAssignmentCount > 0 ? (
                    <li className="py-3 text-sm text-muted-foreground">
                      + {volunteering.specialAssignmentCount} special assignment
                      {volunteering.specialAssignmentCount === 1 ? "" : "s"}
                    </li>
                  ) : null}
                </ul>
              ) : !volunteering?.nextUp ? (
                <p className="text-sm text-muted-foreground">No volunteer sign-ups yet.</p>
              ) : null}
            </div>
          </section>

          <Button asChild className="min-h-11 w-full sm:w-auto">
            <Link href="/chat">
              <MessageSquare className="me-2 h-4 w-4 shrink-0" aria-hidden />
              Open chat
            </Link>
          </Button>
        </div>
      </MainContent>
      <SiteFooter />
    </>
  )
}
