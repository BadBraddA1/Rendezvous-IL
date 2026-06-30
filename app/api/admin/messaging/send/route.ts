import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"
import { Resend } from "resend"
import { generateMessagingBroadcastEmail } from "@/lib/email-templates"

function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured")
  }
  return new Resend(apiKey)
}

export async function POST(request: Request) {
  try {
    const admin = await checkAdminAuth()
    
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin and editor can send emails
    if (admin.role === 'viewer') {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { recipient, subject, message } = await request.json()

    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message required" }, { status: 400 })
    }

    // Build query based on recipient filter
    let whereClause = ""
    switch (recipient) {
      case "unpaid":
        whereClause = "WHERE full_payment_paid = false"
        break
      case "paid":
        whereClause = "WHERE full_payment_paid = true"
        break
      case "motel":
        whereClause = "WHERE lodging_type = 'motel'"
        break
      case "rv":
        whereClause = "WHERE lodging_type = 'rv'"
        break
      case "tent":
        whereClause = "WHERE lodging_type = 'tent'"
        break
      default:
        whereClause = ""
    }

    // Get recipient emails
    const registrations = await sql.unsafe(`
      SELECT DISTINCT email, family_last_name 
      FROM registrations 
      ${whereClause}
      ORDER BY family_last_name
    `)

    if (registrations.length === 0) {
      return NextResponse.json({ error: "No recipients found" }, { status: 400 })
    }

    // Send emails (in batches for larger lists)
    const batchSize = 50
    let sentCount = 0

    for (let i = 0; i < registrations.length; i += batchSize) {
      const batch = registrations.slice(i, i + batchSize)
      
      try {
        const resend = getResend()
        await resend.emails.send({
          from: "Rendezvous IL <noreply@rendezvousil.com>",
          to: batch.map((r: { email: string }) => r.email),
          subject,
          text: message,
          html: generateMessagingBroadcastEmail(message),
        })
        sentCount += batch.length
      } catch (emailError) {
        console.error("Error sending email batch:", emailError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      recipientCount: sentCount,
      totalRecipients: registrations.length 
    })
  } catch (error) {
    console.error("Error sending bulk email:", error)
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 })
  }
}
