import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// GET - Fetch all announcements
export async function GET() {
  try {
    const announcements = await sql`
      SELECT 
        id, title, message, priority, is_active, 
        show_on_live_updates, show_on_schedule, 
        created_at, expires_at, created_by
      FROM announcements
      ORDER BY created_at DESC
      LIMIT 50
    `

    return NextResponse.json({ announcements })
  } catch (error) {
    console.error("[v0] Error fetching announcements:", error)
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 })
  }
}

// POST - Create new announcement (app / Live Updates / schedule — no GroupMe)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, message, priority, showOnLiveUpdates, showOnSchedule } = body

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 })
    }

    const [announcement] = await sql`
      INSERT INTO announcements (
        title, message, priority, is_active,
        show_on_live_updates, show_on_schedule,
        sent_to_groupme, created_by
      ) VALUES (
        ${title}, ${message}, ${priority || "normal"}, true,
        ${showOnLiveUpdates || false}, ${showOnSchedule || false},
        false, 'admin'
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      announcement,
      message: "Announcement created successfully",
    })
  } catch (error) {
    console.error("[v0] Error creating announcement:", error)
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 })
  }
}
