import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldAlert, LogIn } from "lucide-react"
import { getCurrentAdmin } from "@/lib/clerk-auth"
import {
  canAccessRegistrationTest,
  isLocalRegistrationTestBypass,
} from "@/lib/registration-access"
import { isSignatureEmailsEnabled } from "@/lib/registration-settings"
import { RegistrationTest2026Client } from "./registration-test2026-client"

export default async function RegistrationTestPage() {
  const localDev = await isLocalRegistrationTestBypass()

  if (!localDev) {
    const admin = await getCurrentAdmin()
    const allowed = await canAccessRegistrationTest()

    if (!admin) {
      return (
        <div className="min-h-screen bg-background">
          <SiteHeader />
          <main className="site-container site-below-header-loose flex min-h-[50vh] items-center justify-center pb-16">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <LogIn className="mx-auto mb-4 h-10 w-10 text-primary" />
                <CardTitle>Sign in required</CardTitle>
                <CardDescription>
                  Admin test registration is only available to signed-in staff.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/sign-in?redirect_url=/registration-test2026">Sign in</Link>
                </Button>
              </CardContent>
            </Card>
          </main>
          <SiteFooter />
        </div>
      )
    }

    if (!allowed) {
      return (
        <div className="min-h-screen bg-background">
          <SiteHeader />
          <main className="site-container site-below-header-loose flex min-h-[50vh] items-center justify-center pb-16">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                <CardTitle>Test registration is off</CardTitle>
                <CardDescription>
                  Turn on <strong>Admin test registration</strong> on the admin dashboard, then come back here to walk
                  through the full form.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button asChild>
                  <Link href="/admin">Open admin dashboard</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/account">My account</Link>
                </Button>
              </CardContent>
            </Card>
          </main>
          <SiteFooter />
        </div>
      )
    }
  }

  const signatureEmailsEnabled = await isSignatureEmailsEnabled()

  return (
    <RegistrationTest2026Client
      localDevBypass={localDev}
      signatureEmailsEnabled={signatureEmailsEnabled}
    />
  )
}
