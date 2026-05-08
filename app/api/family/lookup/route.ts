import { currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_DATABASE_URL!)

export async function GET() {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const email = user.emailAddresses[0]?.emailAddress
    const clerkUserId = user.id

    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 })
    }

    // First try to find by clerk_user_id, then by email
    let family = await sql`
      SELECT * FROM families 
      WHERE clerk_user_id = ${clerkUserId}
      LIMIT 1
    `

    // If not found by clerk_user_id, try email
    if (family.length === 0) {
      family = await sql`
        SELECT * FROM families 
        WHERE LOWER(email) = LOWER(${email})
        LIMIT 1
      `

      // If found by email, link the clerk_user_id for future lookups
      if (family.length > 0) {
        await sql`
          UPDATE families 
          SET clerk_user_id = ${clerkUserId}, updated_at = NOW()
          WHERE id = ${family[0].id}
        `
      }
    }

    if (family.length === 0) {
      return NextResponse.json({ 
        found: false,
        isReturningFamily: false,
        message: "No previous registration found"
      })
    }

    const familyId = family[0].id

    // Get all family members
    const members = await sql`
      SELECT * FROM family_members_v2 
      WHERE family_id = ${familyId}
      ORDER BY date_of_birth ASC NULLS LAST
    `

    // Get previous registrations
    const registrations = await sql`
      SELECT event_year, lodging_type, payment_status, total_cost, created_at
      FROM registrations_v2 
      WHERE family_id = ${familyId}
      ORDER BY event_year DESC
    `

    // Check if already registered for 2027
    const has2027Registration = registrations.some((r: { event_year: number }) => r.event_year === 2027)

    // Get 2026 attendees for reference (who attended last year)
    const lastYearAttendees = await sql`
      SELECT ra.*, fmv.first_name, fmv.last_name
      FROM registration_attendees ra
      JOIN family_members_v2 fmv ON fmv.id = ra.family_member_id
      JOIN registrations_v2 rv ON rv.id = ra.registration_id
      WHERE rv.family_id = ${familyId} AND rv.event_year = 2026
    `

    return NextResponse.json({
      found: true,
      isReturningFamily: true,
      hasCurrentYearRegistration: has2027Registration,
      family: {
        id: family[0].id,
        email: family[0].email,
        familyLastName: family[0].family_last_name,
        husbandFirstName: family[0].husband_first_name,
        wifeFirstName: family[0].wife_first_name,
        address: family[0].address,
        city: family[0].city,
        state: family[0].state,
        zip: family[0].zip,
        husbandPhone: family[0].husband_phone,
        wifePhone: family[0].wife_phone,
        homeCongregation: family[0].home_congregation,
        yearsHomeschooling: family[0].years_homeschooling,
      },
      members: members.map((m: Record<string, unknown>) => ({
        id: m.id,
        firstName: m.first_name,
        lastName: m.last_name,
        dateOfBirth: m.date_of_birth,
        gender: m.gender,
        isBaptized: m.is_baptized,
        // Calculate current age
        age: m.date_of_birth 
          ? Math.floor((Date.now() - new Date(m.date_of_birth as string).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null
      })),
      previousRegistrations: registrations.map((r: Record<string, unknown>) => ({
        year: r.event_year,
        lodgingType: r.lodging_type,
        paymentStatus: r.payment_status,
        totalCost: r.total_cost,
      })),
      lastYearAttendees: lastYearAttendees.map((a: Record<string, unknown>) => ({
        memberId: a.family_member_id,
        firstName: a.first_name,
        lastName: a.last_name,
        ageAtEvent: a.age_at_event,
        rateKey: a.rate_key,
        healthConditions: a.health_conditions,
      }))
    })
  } catch (error) {
    console.error("Family lookup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
