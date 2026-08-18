import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"
import { sendkit, registrationEmailFrom } from "@/lib/sendkit"
import { generateAdminBulkEmail } from "@/lib/email-templates"

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
      sendkit.emails.send({
        from: registrationEmailFrom(),
        to: reg.email,
        subject: subject,
        html: generateAdminBulkEmail(reg.family_last_name, message),
      }),
    )

    const results = await Promise.allSettled(emailPromises)
    const successCount = results.filter(
      (r) => r.status === "fulfilled" && !r.value.error,
    ).length

    return NextResponse.json({ sent: successCount, total: registrations.length })
  } catch (error) {
    console.error("[v0] Bulk email error:", error)
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 })
  }
}
