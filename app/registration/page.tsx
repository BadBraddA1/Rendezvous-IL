"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, Users, Calendar, MapPin, ArrowRight, Sparkles, ArrowLeft } from "lucide-react"

interface FamilyMember {
  id: number
  firstName: string
  lastName: string
  dateOfBirth: string | null
  gender: string | null
  isBaptized: boolean
  age: number | null
}

interface FamilyData {
  id: number
  email: string
  familyLastName: string
  husbandFirstName: string | null
  wifeFirstName: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  husbandPhone: string | null
  wifePhone: string | null
  homeCongregation: string | null
  yearsHomeschooling: number | null
}

interface PreviousRegistration {
  year: number
  lodgingType: string
  paymentStatus: string
  totalCost: number
}

interface FamilyLookupResponse {
  found: boolean
  isReturningFamily: boolean
  hasCurrentYearRegistration?: boolean
  family?: FamilyData
  members?: FamilyMember[]
  previousRegistrations?: PreviousRegistration[]
  message?: string
}

export default function RegistrationPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [familyData, setFamilyData] = useState<FamilyLookupResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in")
      return
    }

    if (isSignedIn) {
      fetchFamilyData()
    }
  }, [isLoaded, isSignedIn, router])

  const fetchFamilyData = async () => {
    try {
      const response = await fetch("/api/family/lookup")
      const data = await response.json()
      setFamilyData(data)
    } catch (err) {
      console.error("Error fetching family data:", err)
      setError("Failed to load registration data")
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-24">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your registration...</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-24">
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    )
  }

  // Already registered for 2027
  if (familyData?.hasCurrentYearRegistration) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-24">
          <Card className="mx-auto max-w-lg text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">You&apos;re Already Registered!</CardTitle>
              <CardDescription>
                The {familyData.family?.familyLastName} family is registered for Rendezvous 2027.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-left">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>May 3-7, 2027</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Lake Williamson Christian Center</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Link href="/schedule" className="flex-1">
                  <Button variant="outline" className="w-full">View Schedule</Button>
                </Link>
                <Link href="/" className="flex-1">
                  <Button className="w-full">Back to Home</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    )
  }

  // Returning family - show express registration option
  if (familyData?.isReturningFamily && familyData.family) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-24">
          <div className="mx-auto max-w-2xl space-y-6">
            {/* Welcome Back Card */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Welcome Back, {familyData.family.familyLastName} Family!</CardTitle>
                <CardDescription>
                  We found your information from Rendezvous 2026. Use Express Registration to quickly sign up for 2027!
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Family Info Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  Your Family Information
                </CardTitle>
                <CardDescription>This information will be pre-filled for your 2027 registration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contact Email</p>
                    <p className="text-foreground">{familyData.family.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Home Congregation</p>
                    <p className="text-foreground">{familyData.family.homeCongregation || "Not specified"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p className="text-foreground">
                      {familyData.family.address ? (
                        `${familyData.family.address}, ${familyData.family.city}, ${familyData.family.state} ${familyData.family.zip}`
                      ) : (
                        "Not specified"
                      )}
                    </p>
                  </div>
                </div>

                {/* Family Members */}
                {familyData.members && familyData.members.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="mb-3 text-sm font-medium text-muted-foreground">Family Members ({familyData.members.length})</p>
                    <div className="space-y-2">
                      {familyData.members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                          <span className="font-medium">{member.firstName} {member.lastName}</span>
                          <span className="text-sm text-muted-foreground">
                            {member.age !== null ? `Age ${member.age}` : "Age unknown"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Previous Registration Info */}
                {familyData.previousRegistrations && familyData.previousRegistrations.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="mb-2 text-sm font-medium text-muted-foreground">Previous Attendance</p>
                    <div className="flex flex-wrap gap-2">
                      {familyData.previousRegistrations.map((reg) => (
                        <span key={reg.year} className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                          {reg.year}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/registration/express" className="flex-1">
                <Button className="w-full gap-2" size="lg">
                  <Sparkles className="h-4 w-4" />
                  Express Registration
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/registration/new" className="flex-1">
                <Button variant="outline" className="w-full" size="lg">
                  Start Fresh Registration
                </Button>
              </Link>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Express Registration lets you review and update your info, then quickly complete registration for 2027.
            </p>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  // New family - show new registration option
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-lg space-y-6">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome to Rendezvous 2027!</CardTitle>
              <CardDescription>
                We&apos;re excited to have you join us. Let&apos;s get your family registered for this year&apos;s retreat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-left">
                <h3 className="font-medium">Event Details</h3>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>May 3-7, 2027 (Monday - Friday)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>Lake Williamson Christian Center, Carlinville, IL</span>
                  </div>
                </div>
              </div>
              
              <Link href="/registration/new">
                <Button className="w-full gap-2" size="lg">
                  Start Registration
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>

              <Button variant="outline" asChild className="w-full">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
