import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { 
  getCurrentFamily, 
  getFamilyRegistrations, 
  getFamilyByEmail,
  linkFamilyToClerk 
} from "@/lib/family-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Church, 
  Calendar, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ArrowRight,
  History,
  Map,
  Camera,
} from "lucide-react"

export default async function AccountPage() {
  const user = await currentUser()

  if (!user) {
    redirect("/sign-in?redirect_url=/account")
  }

  const userEmail = user.emailAddresses[0]?.emailAddress

  // Try to get linked family
  let family = await getCurrentFamily()

  // If no linked family, try to find and link by email
  if (!family && userEmail) {
    const matchedFamily = await getFamilyByEmail(userEmail)
    if (matchedFamily) {
      // If family exists but isn't linked to anyone, link it to this user
      if (!matchedFamily.clerk_user_id) {
        await linkFamilyToClerk(matchedFamily.id, user.id)
      }
      // Use the matched family regardless (it might be linked to this user already)
      family = matchedFamily
    }
  }

  // Get registration history
  const registrations = userEmail ? await getFamilyRegistrations(userEmail) : []

  return (
    <div className="mx-auto max-w-4xl space-y-8">
        {/* Welcome Header */}
        <div className="space-y-2">
          <h1 className="text-section-title text-balance">
            Welcome, {user.firstName || "Friend"}!
          </h1>
          <p className="text-lead text-muted-foreground">
            Manage your family profile and view your registration history.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-widget-heading">
                <Calendar className="h-5 w-5 text-primary" />
                Register for 2027
              </CardTitle>
              <CardDescription>
                {registrations.length > 0 
                  ? "Use express registration with your saved info"
                  : "Start your registration for Rendezvous 2027"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href={registrations.length > 0 ? "/registration?express=true" : "/registration"}>
                  {registrations.length > 0 ? "Express Registration" : "Start Registration"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {family && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-widget-heading">
                  <Users className="h-5 w-5" />
                  Family Profile
                </CardTitle>
                <CardDescription>
                  View and update your family information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full bg-transparent">
                  <Link href="/account/profile">
                    Manage Profile
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {family && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-widget-heading">
                  <Camera className="h-5 w-5" />
                  Family Directory
                </CardTitle>
                <CardDescription>
                  Share a photo so other registered families can get to know you
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button asChild className="w-full">
                  <Link href="/account/profile">
                    Upload photo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full bg-transparent">
                  <Link href="/directory">
                    Browse directory
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Family Information */}
        {family ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {family.family_last_name} Family
              </CardTitle>
              <CardDescription>
                Your linked family profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {family.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{family.email}</p>
                    </div>
                  </div>
                )}
                
                {(family.husband_phone || family.wife_phone) && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">
                        {family.husband_phone || family.wife_phone}
                      </p>
                    </div>
                  </div>
                )}

                {(family.city && family.state) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {family.city}, {family.state}
                      </p>
                    </div>
                  </div>
                )}

                {family.home_congregation && (
                  <div className="flex items-start gap-3">
                    <Church className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Home Congregation</p>
                      <p className="text-sm text-muted-foreground">{family.home_congregation}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                No Family Profile Linked
              </CardTitle>
              <CardDescription>
                Your account isn&apos;t linked to a family profile yet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If you&apos;ve registered before, your account will be automatically linked 
                when you sign up with the same email address used during registration.
              </p>
              <p className="text-sm text-muted-foreground">
                If this is your first time, complete a registration to create your family profile.
              </p>
              <Button asChild>
                <Link href="/registration">
                  Start Registration
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Registration History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Registration History
            </CardTitle>
            <CardDescription>
              Your past and current registrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {registrations.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No registrations found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Register for Rendezvous 2027 to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {registrations.map((reg) => {
                  const totalCost = Number(reg.lodging_total) + 
                    Number(reg.tshirt_total) + 
                    Number(reg.climbing_tower_total) + 
                    Number(reg.registration_fee)

                  return (
                    <div 
                      key={reg.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{reg.family_last_name} Family</p>
                          {reg.checked_in && (
                            <Badge variant="outline" className="border-success/30 text-success">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Checked In
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {reg.attendee_count} attendees • {reg.lodging_type} lodging
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Registered {new Date(reg.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">${totalCost.toFixed(2)}</p>
                          {reg.full_payment_paid ? (
                            <Badge className="border border-success/30 bg-surface-highlight text-success hover:bg-surface-highlight">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Paid in Full
                            </Badge>
                          ) : reg.registration_fee_paid ? (
                            <Badge variant="secondary" className="border border-warning/30 bg-surface-warm text-warning">
                              <Clock className="h-3 w-3 mr-1" />
                              Deposit Paid
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Payment Due
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendee Maps */}
        {registrations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Attendee Maps
              </CardTitle>
              <CardDescription>
                Access maps for years you&apos;ve attended
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Show map access for each year they have a registration */}
                {Array.from(new Set(registrations.map(() => 2026))).map((year) => (
                  <Link 
                    key={year}
                    href={`/map${year}`}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Rendezvous {year}</p>
                        <p className="text-sm text-muted-foreground">View attendee map</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-widget-heading">Account Information</CardTitle>
            <CardDescription>
              Your Clerk account details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <p className="font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {userEmail}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  )
}
