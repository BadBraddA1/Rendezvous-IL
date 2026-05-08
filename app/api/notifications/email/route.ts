import { neon } from "@neondatabase/serverless"

export async function POST(request: Request) {
  try {
    const { email, notification_type } = await request.json()

    // Validate email
    if (!email || !email.includes("@")) {
      return Response.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    if (!notification_type) {
      return Response.json(
        { error: "Notification type is required" },
        { status: 400 }
      )
    }

    const sql = neon(process.env.NEON_DATABASE_URL!)

    // Insert email into notification list
    await sql`
      INSERT INTO email_notification_list (email, notification_type, created_at)
      VALUES (${email}, ${notification_type}, NOW())
      ON CONFLICT DO NOTHING
    `

    return Response.json(
      { success: true, message: "Email saved successfully" },
      { status: 201 }
    )
  } catch (error) {
    console.error("[v0] Email notification error:", error)
    return Response.json(
      { error: "Failed to save email" },
      { status: 500 }
    )
  }
}
