import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentFamily, getFamilyByEmail, linkFamilyToClerk } from "@/lib/family-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Church, 
  Home,
  ArrowLeft,
  AlertCircle
} from "lucide-react"

export default async function ProfilePage() {
  const user = await currentUser()

  if (!user) {
    redirect("/sign-in?redirect_url=/account/profile")
  }

  const userEmail = user.emailAddresses[0]?.emailAddress

  // Try to get linked family
  let family = await getCurrentFamily()

  // If no linked family, try to auto-link by email
  if (!family && userEmail) {
    const matchedFamily = await getFamilyByEmail(userEmail)
    if (matchedFamily) {
      await linkFamilyToClerk(matchedFamily.id, user.id)
      family = matchedFamily
    }
  }

  if (!family) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/account" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                No Family Profile Found
              </CardTitle>
              <CardDescription>
                Your account is not linked to a family profile yet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Complete a registration to create your family profile, or if you&apos;ve 
                registered before with a different email, please contact the organizers 
                to link your account.
              </p>
              <Button asChild>
                <Link href="/registration">Start Registration</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/account" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Family Profile</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your family information
          </p>
        </div>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
            <CardDescription>
              Primary contact details for your family
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lastName">Family Name</Label>
                <Input 
                  id="lastName" 
                  value={family.family_last_name || ""} 
                  disabled 
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    value={family.email || ""} 
                    disabled 
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {family.husband_phone && (
                <div className="space-y-2">
                  <Label htmlFor="husbandPhone">Husband&apos;s Phone</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="husbandPhone" 
                      value={family.husband_phone || ""} 
                      disabled 
                      className="bg-muted"
                    />
                  </div>
                </div>
              )}
              {family.wife_phone && (
                <div className="space-y-2">
                  <Label htmlFor="wifePhone">Wife&apos;s Phone</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="wifePhone" 
                      value={family.wife_phone || ""} 
                      disabled 
                      className="bg-muted"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {family.street && (
              <div className="space-y-2">
                <Label htmlFor="street">Street Address</Label>
                <Input 
                  id="street" 
                  value={family.street || ""} 
                  disabled 
                  className="bg-muted"
                />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input 
                  id="city" 
                  value={family.city || ""} 
                  disabled 
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input 
                  id="state" 
                  value={family.state || ""} 
                  disabled 
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">Zip Code</Label>
                <Input 
                  id="zip" 
                  value={family.zip || ""} 
                  disabled 
                  className="bg-muted"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Congregation */}
        {family.home_congregation && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Church className="h-5 w-5" />
                Home Congregation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input 
                value={family.home_congregation || ""} 
                disabled 
                className="bg-muted"
              />
            </CardContent>
          </Card>
        )}

        {/* Update Info Notice */}
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Need to update your information?
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  To update your family profile, please contact the event organizers at{" "}
                  <a href="mailto:Stephen@Bradd.us" className="underline hover:no-underline">
                    Stephen@Bradd.us
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
