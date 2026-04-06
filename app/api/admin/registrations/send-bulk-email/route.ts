import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { Resend } from "resend"
import { sql } from "@/lib/db"

const resend = new Resend(process.env.Resend_API)

export async function POST(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { subject, message, registrationIds } = await req.json()

    // Get email addresses
    let registrations
    if (registrationIds && registrationIds.length > 0) {
      registrations = await sql`
        SELECT email, family_last_name 
        FROM registrations 
        WHERE id = ANY(${registrationIds})
      `
    } else {
      registrations = await sql`
        SELECT email, family_last_name 
        FROM registrations
      `
    }

    // Send emails
    const emailPromises = registrations.map((reg) =>
      resend.emails.send({
        from: "Rendezvous Admin <noreply@braddcorp.com>",
        to: reg.email,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f97316;">Rendezvous 2026</h2>
            <p>Hello ${reg.family_last_name} Family,</p>
            <div style="margin: 20px 0; line-height: 1.6;">
              ${message.split("\n").join("<br>")}
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              This email was sent from the Rendezvous Admin Team.<br>
              If you have questions, please reply to this email.
            </p>
          </div>
        `,
      }),
    )

    const results = await Promise.allSettled(emailPromises)
    const successCount = results.filter((r) => r.status === "fulfilled").length

    return NextResponse.json({ sent: successCount, total: registrations.length })
  } catch (error) {
    console.error("[v0] Bulk email error:", error)
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 })
  }
}
