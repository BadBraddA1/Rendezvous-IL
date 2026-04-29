import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// GET - Fetch all announcements
export async function GET() {
  try {
    const announcements = await sql`
      SELECT 
        id, title, message, priority, is_active, 
        show_on_live_updates, show_on_schedule, 
        sent_to_groupme, groupme_message_id,
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

// POST - Create new announcement
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, message, priority, sendToGroupMe, showOnLiveUpdates, showOnSchedule } = body

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 })
    }

    // Create the announcement in the database
    const [announcement] = await sql`
      INSERT INTO announcements (
        title, message, priority, is_active,
        show_on_live_updates, show_on_schedule,
        sent_to_groupme, created_by
      ) VALUES (
        ${title}, ${message}, ${priority || 'normal'}, true,
        ${showOnLiveUpdates || false}, ${showOnSchedule || false},
        ${sendToGroupMe || false}, 'admin'
      )
      RETURNING *
    `

    // Send to GroupMe if requested
    if (sendToGroupMe) {
      try {
        const groupMeResponse = await sendToGroupMeBot(title, message)
        if (groupMeResponse.success) {
          await sql`
            UPDATE announcements 
            SET sent_to_groupme = true, groupme_message_id = ${groupMeResponse.messageId || null}
            WHERE id = ${announcement.id}
          `
        }
      } catch (gmError) {
        console.error("[v0] GroupMe send error:", gmError)
        // Don't fail the whole request if GroupMe fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      announcement,
      message: "Announcement created successfully" 
    })
  } catch (error) {
    console.error("[v0] Error creating announcement:", error)
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 })
  }
}

// Helper function to send to GroupMe
async function sendToGroupMeBot(title: string, message: string): Promise<{ success: boolean; messageId?: string }> {
  const botId = process.env.GROUPME_BOT_ID
  
  if (!botId) {
    console.log("[v0] GroupMe bot ID not configured")
    return { success: false }
  }

  const fullMessage = `📢 ${title}\n\n${message}`

  const response = await fetch("https://api.groupme.com/v3/bots/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bot_id: botId,
      text: fullMessage,
    }),
  })

  if (response.ok || response.status === 202) {
    return { success: true }
  }

  return { success: false }
}
