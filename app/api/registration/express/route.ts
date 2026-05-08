import { currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      familyId,
      address,
      city,
      state,
      zip,
      husbandPhone,
      wifePhone,
      homeCongregation,
      lodgingType,
      emergencyContact,
      attendees,
    } = body

    if (!familyId || !attendees || attendees.length === 0) {
      return NextResponse.json({ error: "Invalid registration data" }, { status: 400 })
    }

    // Verify family belongs to this user
    const family = await sql`
      SELECT id, clerk_user_id, email FROM families WHERE id = ${familyId}
    `
    
    if (family.length === 0) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 })
    }

    // Check clerk_user_id or email matches
    const userEmail = user.emailAddresses[0]?.emailAddress
    if (family[0].clerk_user_id !== user.id && family[0].email.toLowerCase() !== userEmail?.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check if already registered for 2027
    const existingReg = await sql`
      SELECT id FROM registrations_v2 
      WHERE family_id = ${familyId} AND event_year = 2027
    `
    
    if (existingReg.length > 0) {
      return NextResponse.json({ error: "Already registered for 2027" }, { status: 400 })
    }

    // Update family info
    await sql`
      UPDATE families SET
        address = ${address},
        city = ${city},
        state = ${state},
        zip = ${zip},
        husband_phone = ${husbandPhone},
        wife_phone = ${wifePhone},
        home_congregation = ${homeCongregation},
        clerk_user_id = ${user.id},
        updated_at = NOW()
      WHERE id = ${familyId}
    `

    // Create 2027 registration
    const registration = await sql`
      INSERT INTO registrations_v2 (
        family_id, event_year, lodging_type, payment_status,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        created_at
      ) VALUES (
        ${familyId}, 2027, ${lodgingType}, 'pending',
        ${emergencyContact.name}, ${emergencyContact.phone}, ${emergencyContact.relationship},
        NOW()
      )
      RETURNING id
    `

    const registrationId = registration[0].id

    // Calculate age at event (May 2027)
    const eventDate = new Date(2027, 4, 3) // May 3, 2027

    // Create registration attendees
    for (const attendee of attendees) {
      // Get the family member's DOB to calculate age
      const member = await sql`
        SELECT date_of_birth FROM family_members_v2 WHERE id = ${attendee.memberId}
      `
      
      let ageAtEvent = null
      if (member.length > 0 && member[0].date_of_birth) {
        const dob = new Date(member[0].date_of_birth)
        ageAtEvent = Math.floor((eventDate.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      }

      // Determine rate key based on age
      let rateKey = "adult_full"
      if (ageAtEvent !== null) {
        if (ageAtEvent < 3) rateKey = "infant"
        else if (ageAtEvent < 6) rateKey = "preschool"
        else if (ageAtEvent < 12) rateKey = "child"
        else if (ageAtEvent < 18) rateKey = "teen"
      }

      await sql`
        INSERT INTO registration_attendees (
          registration_id, family_member_id, age_at_event, rate_key,
          health_conditions, created_at
        ) VALUES (
          ${registrationId}, ${attendee.memberId}, ${ageAtEvent}, ${rateKey},
          ${attendee.healthConditions || null}, NOW()
        )
      `
    }

    return NextResponse.json({
      success: true,
      registrationId,
      message: "Registration completed successfully",
    })
  } catch (error) {
    console.error("Express registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
