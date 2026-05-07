import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"
import { generateRegistrationConfirmationEmail, generateAdminNotificationEmail } from "@/lib/email-templates"
import { resend } from "@/lib/resend"

export async function POST(request: Request) {
  // Registration opens January 1, 2027
  return NextResponse.json(
    { error: "Registration for Rendezvous 2027 opens January 1, 2027. Stay tuned!" },
    { status: 403 }
  )

  // Original registration logic (disabled)
  /*
  try {
    const data = await request.json()
    const sql = neon(process.env.NEON_DATABASE_URL!)

    const [registration] = await sql`
      INSERT INTO registrations (
        family_last_name, email, husband_phone, wife_phone, address, city, state, zip,
        home_congregation, father_occupation, times_attended, years_homeschooling,
        currently_homeschooling, arrival_notes, lodging_type, lodging_total,
        tshirt_total, climbing_tower_total, scholarship_donation, scholarship_requested,
        emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
        father_signature, mother_signature, registration_fee, payment_status
      ) VALUES (
        ${data.familyLastName}, ${data.email}, ${data.husbandPhone}, ${data.wifePhone},
        ${data.address}, ${data.city}, ${data.state}, ${data.zip},
        ${data.homeCongregation}, ${data.fatherOccupation}, ${data.timesAttended},
        ${data.yearsHomeschooling}, ${data.currentlyHomeschooling}, ${data.arrivalNotes},
        ${data.lodgingType}, ${data.lodgingTotal}, ${data.tshirtTotal}, ${data.climbingTowerTotal},
        ${data.scholarshipDonation}, ${data.scholarshipRequested},
        ${data.emergencyContactName}, ${data.emergencyContactRelationship}, ${data.emergencyContactPhone},
        ${data.fatherSignature}, ${data.motherSignature}, ${data.registrationFee}, 'pending'
      ) RETURNING id
    `

    const registrationId = registration.id

    for (const member of data.familyMembers) {
      if (member.firstName && (member.dateOfBirth || member.isOver18)) {
        const lastName = member.useCustomLastName && member.lastName ? member.lastName : data.familyLastName

        console.log(`[v0] Saving family member: ${member.firstName} ${lastName}, Age: ${member.age}`)

        await sql`
          INSERT INTO family_members (
            registration_id, first_name, last_name, date_of_birth, age, is_baptized, person_cost
          ) VALUES (
            ${registrationId}, ${member.firstName}, ${lastName}, ${member.dateOfBirth || null}, ${member.age},
            ${member.isBaptized}, ${member.personCost}
          )
        `
      }
    }

    for (const order of data.tshirtOrders) {
      await sql`
        INSERT INTO tshirt_orders (
          registration_id, size, color, quantity, price
        ) VALUES (
          ${registrationId}, ${order.size}, 'TBD', ${order.quantity}, 10.00
        )
      `
    }

    for (const health of data.healthInfo) {
      if (health.fullName && health.condition) {
        await sql`
          INSERT INTO health_info (
            registration_id, full_name, condition, medication_on_hand
          ) VALUES (
            ${registrationId}, ${health.fullName}, ${health.condition}, ${health.medicationOnHand}
          )
        `
      }
    }

    for (const volunteer of data.volunteerSignups) {
      // Insert one row for each volunteer name in the signup
      if (volunteer.names && volunteer.names.length > 0) {
        for (const volunteerName of volunteer.names) {
          await sql`
            INSERT INTO volunteer_signups (
              registration_id, volunteer_type, volunteer_name
            ) VALUES (
              ${registrationId}, ${volunteer.type}, ${volunteerName}
            )
          `
        }
      }
    }

    if (data.sessionSuggestions.moms) {
      await sql`
        INSERT INTO session_suggestions (
          registration_id, session_type, suggestion
        ) VALUES (
          ${registrationId}, 'moms', ${data.sessionSuggestions.moms}
        )
      `
    }
    if (data.sessionSuggestions.dads) {
      await sql`
        INSERT INTO session_suggestions (
          registration_id, session_type, suggestion
        ) VALUES (
          ${registrationId}, 'dads', ${data.sessionSuggestions.dads}
        )
      `
    }

    try {
      const emailHtml = generateRegistrationConfirmationEmail(data, registrationId)

      await resend.emails.send({
        from: "Rendezvous 2027 <noreply@braddcorp.com>",
        to: data.email,
        subject: `Registration Confirmation - Rendezvous 2027 (${data.familyLastName} Family)`,
        html: emailHtml,
      })

      console.log("[v0] Registration confirmation email sent to:", data.email)
    } catch (emailError) {
      console.error("[v0] Failed to send confirmation email:", emailError)
    }

    try {
      const adminEmailHtml = generateAdminNotificationEmail(data, registrationId)

      await resend.emails.send({
        from: "Rendezvous 2027 <noreply@braddcorp.com>",
        to: ["sbradd@rocketmail.com", "adin@braddcorp.com"],
        subject: `New Registration: ${data.familyLastName} Family - Rendezvous 2027`,
        html: adminEmailHtml,
      })

      console.log("[v0] Admin notification emails sent to admins")
    } catch (emailError) {
      console.error("[v0] Failed to send admin notification emails:", emailError)
    }

    return NextResponse.json({ success: true, registrationId })
  } catch (error: any) {
    console.error("[v0] Registration API error:", error)
    console.error("[v0] Error detail:", error?.detail || "no detail")
    console.error("[v0] Error column:", error?.column || "no column")
    console.error("[v0] Error table:", error?.table || "no table")
    console.error("[v0] Error constraint:", error?.constraint || "no constraint")
    const errorMessage = error?.detail || error?.message || "Failed to submit registration"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
  */
}
