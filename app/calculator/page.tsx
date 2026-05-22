import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { CalculatorClient } from "./calculator-client"
import { sql } from "@/lib/db"
import { getCurrentFamily, getFamilyMembers, getFamilyRegistrations } from "@/lib/family-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calculator, Clock } from "lucide-react"

async function isCalculatorEnabled() {
  try {
    const result = await sql`
      SELECT value FROM app_settings WHERE key = 'public_calculator_enabled'
    `
    return result[0]?.value === "true"
  } catch (error) {
    console.error("Error checking calculator status:", error)
    return false
  }
}

async function getActiveRates() {
  try {
    const charts = await sql`
      SELECT * FROM rate_charts WHERE is_active = true LIMIT 1
    `
    
    if (charts.length === 0) {
      // Fallback to 2027 if no active chart
      const charts2027 = await sql`
        SELECT * FROM rate_charts WHERE year = 2027 LIMIT 1
      `
      if (charts2027.length === 0) return null
      
      const rateChart = charts2027[0]
      const rates = await sql`
        SELECT * FROM rates 
        WHERE rate_chart_id = ${rateChart.id}
        ORDER BY category, sort_order
      `
      
      const groupedRates: Record<string, typeof rates> = {}
      for (const rate of rates) {
        if (!groupedRates[rate.category]) {
          groupedRates[rate.category] = []
        }
        groupedRates[rate.category].push(rate)
      }
      
      return { year: rateChart.year, rates: groupedRates }
    }
    
    const rateChart = charts[0]
    
    const rates = await sql`
      SELECT * FROM rates 
      WHERE rate_chart_id = ${rateChart.id}
      ORDER BY category, sort_order
    `
    
    // Group rates by category
    const groupedRates: Record<string, typeof rates> = {}
    for (const rate of rates) {
      if (!groupedRates[rate.category]) {
        groupedRates[rate.category] = []
      }
      groupedRates[rate.category].push(rate)
    }
    
    return {
      year: rateChart.year,
      rates: groupedRates,
    }
  } catch (error) {
    console.error("Error fetching rates:", error)
    return null
  }
}

async function getFamilyData() {
  try {
    const family = await getCurrentFamily()
    
    if (!family) {
      return null
    }

    // Get family members
    const members = await getFamilyMembers(family.id)

    // Get past registrations to check if returning family
    const registrations = await getFamilyRegistrations(family.email || "")
    
    // Check if they have previous registrations
    const hasLastYearRegistration = registrations.length > 0

    // Get most recent registration for lodging preference
    const lastRegistration = registrations[0] || null

    // Get express registration preferences for 2027 if they exist
    const expressPrefs = await sql`
      SELECT * FROM express_registration_2027 
      WHERE family_id = ${family.id}
      LIMIT 1
    `

    // Calculate ages for each member as of the event date (assuming July 2027)
    const eventDate = new Date("2027-07-01")
    const membersWithAges = members.map(member => {
      let age = 0
      if (member.date_of_birth) {
        const dob = new Date(member.date_of_birth)
        age = eventDate.getFullYear() - dob.getFullYear()
        const monthDiff = eventDate.getMonth() - dob.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && eventDate.getDate() < dob.getDate())) {
          age--
        }
      }
      
      // Determine age group
      let ageGroup: "adult" | "youth" | "child" | "infant" = "adult"
      if (age < 6) ageGroup = "infant"
      else if (age < 12) ageGroup = "child"
      else if (age < 18) ageGroup = "youth"

      return {
        id: member.id.toString(),
        firstName: member.first_name,
        lastName: member.last_name,
        dateOfBirth: member.date_of_birth,
        age,
        ageGroup,
        isBaptized: member.is_baptized,
        gender: member.gender,
      }
    })

    return {
      isReturningFamily: hasLastYearRegistration,
      family: {
        id: family.id,
        lastName: family.family_last_name,
        email: family.email,
      },
      members: membersWithAges,
      lastRegistration: lastRegistration ? {
        lodgingType: lastRegistration.lodging_type,
        year: new Date(lastRegistration.created_at).getFullYear(),
      } : null,
      expressPreferences: expressPrefs.length > 0 ? expressPrefs[0] : null,
    }
  } catch (error) {
    console.error("Error fetching family data:", error)
    return null
  }
}

export default async function CalculatorPage() {
  const [ratesData, familyData, isEnabled] = await Promise.all([
    getActiveRates(),
    getFamilyData(),
    isCalculatorEnabled(),
  ])

  // Show coming soon page if calculator is disabled
  if (!isEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto px-4 pt-20 pb-12 md:pt-24">
          <div className="max-w-md mx-auto">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Calculator className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Rate Calculator</CardTitle>
                <CardDescription className="text-base">
                  Coming Soon
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Clock className="h-5 w-5" />
                  <span>We&apos;re preparing the 2027 rates</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  The rate calculator will be available soon. Check back later to estimate your family&apos;s registration costs for Rendezvous 2027.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 pt-20 pb-12 md:pt-24">
        <CalculatorClient ratesData={ratesData} familyData={familyData} />
      </main>
      <SiteFooter />
    </div>
  )
}
