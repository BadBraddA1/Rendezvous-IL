import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentFamily, getFamilyMembers, getFamilyRegistrations } from "@/lib/family-auth"

export async function GET() {
  try {
    const family = await getCurrentFamily()
    
    if (!family) {
      return NextResponse.json({ authenticated: false })
    }

    // Get family members
    const members = await getFamilyMembers(family.id)

    // Get past registrations to check if returning family
    const registrations = await getFamilyRegistrations(family.email || "")
    
    // Check if they registered last year (2026)
    const hasLastYearRegistration = registrations.some(r => {
      const regYear = new Date(r.created_at).getFullYear()
      return regYear === 2026 || r.lodging_type // Check if they have any past registration
    })

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
        id: member.id,
        firstName: member.first_name,
        lastName: member.last_name,
        dateOfBirth: member.date_of_birth,
        age,
        ageGroup,
        isBaptized: member.is_baptized,
        gender: member.gender,
      }
    })

    return NextResponse.json({
      authenticated: true,
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
    })
  } catch (error) {
    console.error("Error fetching family calculator data:", error)
    return NextResponse.json({ error: "Failed to fetch family data" }, { status: 500 })
  }
}
