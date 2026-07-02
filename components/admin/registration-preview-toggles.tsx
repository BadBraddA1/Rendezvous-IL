"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ClipboardList, FlaskConical, Loader2, Zap } from "lucide-react"
import {
  REGISTRATION_EVENT_YEARS,
  registrationYearLabel,
} from "@/lib/registration-event-years"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type RegistrationStatusResponse = {
  testRegistrationEnabled: boolean
  expressRegistrationPreviewEnabled: boolean
  signatureEmailsEnabled: boolean
}

type ToggleKey =
  | "testRegistrationEnabled"
  | "expressRegistrationPreviewEnabled"
  | "signatureEmailsEnabled"

type Props = {
  isAdmin: boolean
}

export function RegistrationPreviewToggles({ isAdmin }: Props) {
  const { data, isLoading } = useSWR<RegistrationStatusResponse>(
    "/api/admin/registration/status",
    fetcher,
  )
  const [togglingKey, setTogglingKey] = useState<ToggleKey | null>(null)

  async function toggleSetting(key: ToggleKey, currentlyEnabled: boolean) {
    if (!isAdmin) return
    setTogglingKey(key)
    try {
      await fetch("/api/admin/registration/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: !currentlyEnabled }),
      })
      mutate("/api/admin/registration/status")
    } catch (error) {
      console.error("Failed to toggle registration preview:", error)
    } finally {
      setTogglingKey(null)
    }
  }

  const testEnabled = data?.testRegistrationEnabled ?? false
  const expressEnabled = data?.expressRegistrationPreviewEnabled ?? false
  const signatureEmailsEnabled = data?.signatureEmailsEnabled ?? false

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-widget-heading flex items-center gap-2">
          <FlaskConical className="h-4 w-4" />
          Registration previews
        </CardTitle>
        <CardDescription>
          Turn these on to test the 2027 registration flow and express registration before the public
          launch. Only signed-in admins can use them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading registration settings...
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Admin test registration</span>
                    <Badge variant={testEnabled ? "default" : "secondary"}>
                      {testEnabled ? "On" : "Off"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Full multi-step form at /registration-test2026. Saves rows tagged ADMIN_TEST.
                  </p>
                  {testEnabled ? (
                    <Button asChild variant="link" className="h-auto p-0 text-sm">
                      <Link href="/registration-test2026">Open test registration</Link>
                    </Button>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {togglingKey === "testRegistrationEnabled" && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <Switch
                    checked={testEnabled}
                    onCheckedChange={() =>
                      void toggleSetting("testRegistrationEnabled", testEnabled)
                    }
                    disabled={!isAdmin || togglingKey !== null}
                    aria-label="Toggle admin test registration"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Express registration preview</span>
                    <Badge variant={expressEnabled ? "default" : "secondary"}>
                      {expressEnabled ? "On" : "Off"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Save lodging preferences for {registrationYearLabel(REGISTRATION_EVENT_YEARS[0])}{" "}
                    using your linked family profile.
                  </p>
                  {expressEnabled ? (
                    <Button asChild variant="link" className="h-auto p-0 text-sm">
                      <Link href="/account/express-registration">Test your express registration</Link>
                    </Button>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {togglingKey === "expressRegistrationPreviewEnabled" && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <Switch
                    checked={expressEnabled}
                    onCheckedChange={() =>
                      void toggleSetting("expressRegistrationPreviewEnabled", expressEnabled)
                    }
                    disabled={!isAdmin || togglingKey !== null}
                    aria-label="Toggle express registration preview"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Parent signature emails</span>
                    <Badge variant={signatureEmailsEnabled ? "default" : "secondary"}>
                      {signatureEmailsEnabled ? "On" : "Off"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Emails each parent a personal signing link after registration. Families can finish
                    registering, but check-in is blocked until both parents have signed.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {togglingKey === "signatureEmailsEnabled" && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <Switch
                    checked={signatureEmailsEnabled}
                    onCheckedChange={() =>
                      void toggleSetting("signatureEmailsEnabled", signatureEmailsEnabled)
                    }
                    disabled={!isAdmin || togglingKey !== null}
                    aria-label="Toggle parent signature emails"
                  />
                </div>
              </div>
            </div>

            {!isAdmin && (
              <p className="text-sm text-muted-foreground">Only admins can change these toggles.</p>
            )}

            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <ClipboardList className="h-4 w-4" />
                What to test
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Test registration — every form step, payment summary, and Turso insert.</li>
                <li>Express registration — lodging prefs saved to express_registration_2027.</li>
              </ul>
              <p className="mt-2 flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                Link a family on /account before testing express registration.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
