"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft, ArrowRight, Check, Users, Home, Phone, Heart, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FamilyMember {
  id: number
  firstName: string
  lastName: string
  dateOfBirth: string | null
  age: number | null
  attending: boolean
  healthConditions: string
}

interface FamilyData {
  id: number
  email: string
  familyLastName: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  husbandPhone: string | null
  wifePhone: string | null
  homeCongregation: string | null
}

type StepType = "review" | "members" | "lodging" | "emergency" | "confirm"

export default function ExpressRegistrationPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<StepType>("review")
  const [error, setError] = useState<string | null>(null)

  // Family data
  const [family, setFamily] = useState<FamilyData | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  
  // Form state
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [zip, setZip] = useState("")
  const [husbandPhone, setHusbandPhone] = useState("")
  const [wifePhone, setWifePhone] = useState("")
  const [homeCongregation, setHomeCongregation] = useState("")
  const [lodgingType, setLodgingType] = useState("")
  const [emergencyName, setEmergencyName] = useState("")
  const [emergencyPhone, setEmergencyPhone] = useState("")
  const [emergencyRelationship, setEmergencyRelationship] = useState("")

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
      
      if (!data.isReturningFamily) {
        router.push("/registration/new")
        return
      }

      setFamily(data.family)
      setMembers(data.members.map((m: FamilyMember & { healthConditions?: string }) => ({
        ...m,
        attending: true,
        healthConditions: m.healthConditions || ""
      })))
      
      // Pre-fill form
      setAddress(data.family.address || "")
      setCity(data.family.city || "")
      setState(data.family.state || "")
      setZip(data.family.zip || "")
      setHusbandPhone(data.family.husbandPhone || "")
      setWifePhone(data.family.wifePhone || "")
      setHomeCongregation(data.family.homeCongregation || "")
      
      // Get last year's lodging preference
      if (data.previousRegistrations?.length > 0) {
        setLodgingType(data.previousRegistrations[0].lodgingType || "")
      }
    } catch (err) {
      console.error("Error fetching family data:", err)
      setError("Failed to load your information")
    } finally {
      setLoading(false)
    }
  }

  const toggleMemberAttending = (memberId: number) => {
    setMembers(members.map(m => 
      m.id === memberId ? { ...m, attending: !m.attending } : m
    ))
  }

  const updateMemberHealth = (memberId: number, healthConditions: string) => {
    setMembers(members.map(m => 
      m.id === memberId ? { ...m, healthConditions } : m
    ))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/registration/express", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId: family?.id,
          address,
          city,
          state,
          zip,
          husbandPhone,
          wifePhone,
          homeCongregation,
          lodgingType,
          emergencyContact: {
            name: emergencyName,
            phone: emergencyPhone,
            relationship: emergencyRelationship,
          },
          attendees: members.filter(m => m.attending).map(m => ({
            memberId: m.id,
            healthConditions: m.healthConditions,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Registration failed")
      }

      router.push("/registration/success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setSubmitting(false)
    }
  }

  const steps: { key: StepType; label: string; icon: React.ReactNode }[] = [
    { key: "review", label: "Review Info", icon: <Home className="h-4 w-4" /> },
    { key: "members", label: "Attendees", icon: <Users className="h-4 w-4" /> },
    { key: "lodging", label: "Lodging", icon: <Home className="h-4 w-4" /> },
    { key: "emergency", label: "Emergency", icon: <Phone className="h-4 w-4" /> },
    { key: "confirm", label: "Confirm", icon: <Check className="h-4 w-4" /> },
  ]

  const currentStepIndex = steps.findIndex(s => s.key === step)
  const attendingCount = members.filter(m => m.attending).length

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 py-24">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your information...</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-2xl">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((s, i) => (
                <div key={s.key} className="flex items-center">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    i < currentStepIndex 
                      ? "border-primary bg-primary text-primary-foreground" 
                      : i === currentStepIndex
                        ? "border-primary text-primary"
                        : "border-muted text-muted-foreground"
                  }`}>
                    {i < currentStepIndex ? <Check className="h-5 w-5" /> : s.icon}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`hidden h-0.5 w-12 sm:block md:w-20 ${
                      i < currentStepIndex ? "bg-primary" : "bg-muted"
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs">
              {steps.map((s) => (
                <span key={s.key} className={`w-16 text-center ${s.key === step ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step Content */}
          {step === "review" && (
            <Card>
              <CardHeader>
                <CardTitle>Review Your Information</CardTitle>
                <CardDescription>Please verify your contact information is up to date</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="zip">ZIP</Label>
                      <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="husbandPhone">Husband&apos;s Phone</Label>
                    <Input id="husbandPhone" value={husbandPhone} onChange={(e) => setHusbandPhone(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="wifePhone">Wife&apos;s Phone</Label>
                    <Input id="wifePhone" value={wifePhone} onChange={(e) => setWifePhone(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="congregation">Home Congregation</Label>
                    <Input id="congregation" value={homeCongregation} onChange={(e) => setHomeCongregation(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "members" && (
            <Card>
              <CardHeader>
                <CardTitle>Who&apos;s Attending?</CardTitle>
                <CardDescription>Select family members attending Rendezvous 2027 and update any health information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className={`rounded-lg border p-4 transition-colors ${member.attending ? "border-primary bg-primary/5" : "border-muted"}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        id={`member-${member.id}`}
                        checked={member.attending}
                        onCheckedChange={() => toggleMemberAttending(member.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <label htmlFor={`member-${member.id}`} className="flex cursor-pointer items-center justify-between">
                          <span className="font-medium">{member.firstName} {member.lastName}</span>
                          <span className="text-sm text-muted-foreground">
                            {member.age !== null ? `Age ${member.age}` : ""}
                          </span>
                        </label>
                        {member.attending && (
                          <div className="mt-3">
                            <Label htmlFor={`health-${member.id}`} className="text-sm">
                              <Heart className="mb-1 mr-1 inline h-3 w-3" />
                              Health conditions, allergies, or medications
                            </Label>
                            <Input
                              id={`health-${member.id}`}
                              value={member.healthConditions}
                              onChange={(e) => updateMemberHealth(member.id, e.target.value)}
                              placeholder="None"
                              className="mt-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-sm text-muted-foreground">
                  {attendingCount} of {members.length} family members selected
                </p>
              </CardContent>
            </Card>
          )}

          {step === "lodging" && (
            <Card>
              <CardHeader>
                <CardTitle>Lodging Preference</CardTitle>
                <CardDescription>Select your preferred lodging type for Rendezvous 2027</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={lodgingType} onValueChange={setLodgingType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lodging type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motel">Motel Room (sleeps up to 6)</SelectItem>
                    <SelectItem value="rv">RV Site</SelectItem>
                    <SelectItem value="tent">Tent Camping</SelectItem>
                  </SelectContent>
                </Select>
                <div className="rounded-lg bg-muted p-4 text-sm">
                  <p className="font-medium">Lodging Information:</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                    <li>Motel rooms include linens and private bathrooms</li>
                    <li>RV sites have electrical hookups</li>
                    <li>Tent camping is available near the lake</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "emergency" && (
            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
                <CardDescription>Someone NOT attending Rendezvous who we can contact in case of emergency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="emergencyName">Contact Name</Label>
                  <Input id="emergencyName" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="emergencyPhone">Phone Number</Label>
                  <Input id="emergencyPhone" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="emergencyRelationship">Relationship</Label>
                  <Input id="emergencyRelationship" value={emergencyRelationship} onChange={(e) => setEmergencyRelationship(e.target.value)} placeholder="e.g., Grandmother, Friend" />
                </div>
              </CardContent>
            </Card>
          )}

          {step === "confirm" && (
            <Card>
              <CardHeader>
                <CardTitle>Confirm Registration</CardTitle>
                <CardDescription>Please review your registration details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 rounded-lg bg-muted p-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Family</p>
                    <p>{family?.familyLastName} Family</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Lodging</p>
                    <p className="capitalize">{lodgingType || "Not selected"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Attendees ({attendingCount})</p>
                    <p>{members.filter(m => m.attending).map(m => m.firstName).join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Emergency Contact</p>
                    <p>{emergencyName} ({emergencyRelationship}) - {emergencyPhone}</p>
                  </div>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    By completing this registration, you agree to the event policies and liability waiver.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="mt-6 flex justify-between">
            {currentStepIndex > 0 ? (
              <Button variant="outline" onClick={() => setStep(steps[currentStepIndex - 1].key)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link href="/registration">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancel
                </Link>
              </Button>
            )}

            {currentStepIndex < steps.length - 1 ? (
              <Button onClick={() => setStep(steps[currentStepIndex + 1].key)}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Complete Registration
                    <Check className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
