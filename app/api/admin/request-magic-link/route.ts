import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { resend } from "@/lib/resend"

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
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Admin Access Link</h2>
          <p>Click the button below to access the Rendezvous admin dashboard:</p>
          <div style="margin: 30px 0;">
            <a href="${magicLink}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; word-break: keep-all; white-space: nowrap;">
              Access Admin Dashboard
            </a>
          </div>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">Or copy and paste this link:</p>
          <p style="background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">${magicLink}</p>
          <p style="color: #666; font-size: 14px;">This link will expire in 7 days.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this link, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">Rendezvous Admin System</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true, message: "Magic link sent to your email" })
  } catch (error) {
    console.error("Magic link error:", error)
    return NextResponse.json({ error: "Failed to send magic link" }, { status: 500 })
  }
}
