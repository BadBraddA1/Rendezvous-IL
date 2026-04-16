import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    // Validate email
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      )
    }

    // Insert email into notification list
    await sql`
      INSERT INTO email_notification_list (email, notification_type)
      VALUES (${email.toLowerCase().trim()}, 'registration_2027')
      ON CONFLICT (email) DO NOTHING
    `

    return NextResponse.json(
      { message: "You've been added to the notification list!" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error adding email to notification list:", error)
    return NextResponse.json(
      { error: "Failed to add email. Please try again." },
      { status: 500 }
    )
  }
}
