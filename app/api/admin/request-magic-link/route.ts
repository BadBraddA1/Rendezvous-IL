import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { resend } from "@/lib/resend"
import { generateMagicLinkEmail } from "@/lib/email-templates"

const ALLOWED_ADMINS = ["adin@braddcorp.com", "stephen@bradd.us"]

// Generate a secure random token
function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
  let token = ""
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    const normalizedEmail = email.toLowerCase().trim()

    // Check if email is in allowed list
    if (!ALLOWED_ADMINS.includes(normalizedEmail)) {
      return NextResponse.json({ error: "Unauthorized email address" }, { status: 403 })
    }

    // Generate magic link token (valid for 7 days)
    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Store token in database
    await sql`
      INSERT INTO admin_magic_links (email, token, expires_at)
      VALUES (${normalizedEmail}, ${token}, ${expiresAt})
    `

    // Create magic link URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin
    const magicLink = `${baseUrl}/admin/auth/${token}`

    // Send email with magic link
    await resend.emails.send({
      from: "noreply@braddcorp.com",
      to: normalizedEmail,
      subject: "Rendezvous Admin Access Link",
      html: generateMagicLinkEmail(magicLink),
    })

    return NextResponse.json({ success: true, message: "Magic link sent to your email" })
  } catch (error) {
    console.error("Magic link error:", error)
    return NextResponse.json({ error: "Failed to send magic link" }, { status: 500 })
  }
}
