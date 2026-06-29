import Link from "next/link"
import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldAlert, Users } from "lucide-react"
import {
  getCurrentFamily,
  getExpressRegistrationData,
  getFamilyByEmail,
  linkFamilyToClerk,
} from "@/lib/family-auth"
import { canAccessExpressRegistrationPreview } from "@/lib/registration-access"
import { ExpressRegistrationClient } from "./express-registration-client"

export default async function ExpressRegistrationPage() {
  const user = await currentUser()
  if (!user) {
    redirect("/sign-in?redirect_url=/account/express-registration")
  }

  const allowed = await canAccessExpressRegistrationPreview()
  if (!allowed) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader className="text-center">
            <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <CardTitle>Express registration preview is off</CardTitle>
            <CardDescription>
              Turn on <strong>Express registration preview</strong> on the admin dashboard while signed in as an admin.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild>
              <Link href="/admin">Open admin dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/account">Back to account</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const userEmail = user.emailAddresses[0]?.emailAddress
  let family = await getCurrentFamily()

  if (!family && userEmail) {
    const matchedFamily = await getFamilyByEmail(userEmail)
    if (matchedFamily && !matchedFamily.clerk_user_id) {
      await linkFamilyToClerk(matchedFamily.id, user.id)
    }
    family = matchedFamily
  }

  if (!family) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader className="text-center">
            <Users className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <CardTitle>Link a family profile first</CardTitle>
            <CardDescription>
              Express registration uses your linked family record. Sign in with the email from a past registration, or
              complete an admin test registration first.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild>
              <Link href="/account">Go to account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/registration-test2026">Run test registration</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const expressData = userEmail ? await getExpressRegistrationData(userEmail) : null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-section-title">Express registration preview</h1>
        <p className="text-lead text-muted-foreground">
          Test saving 2027 lodging preferences before registration opens to the public.
        </p>
      </div>

      <ExpressRegistrationClient
        familyLastName={family.family_last_name}
        familyEmail={family.email || userEmail || ""}
        suggestedLodging={expressData?.lodgingType ?? null}
      />
    </div>
  )
}
