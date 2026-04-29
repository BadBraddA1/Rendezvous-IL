import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// GET - Fetch active announcements
export async function GET() {
  try {
    const announcements = await sql`
      SELECT id, title, message, priority, expires_at, created_at
      FROM announcements
      WHERE is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY priority DESC, created_at DESC
    `
    
    return NextResponse.json(announcements)
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
  }
}

// POST - Create a new announcement (admin only)
export async function POST(request: Request) {
  try {
    const { title, message, priority, expires_at, send_to_groupme } = await request.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    
    // Insert into database
    const result = await sql`
      INSERT INTO announcements (title, message, priority, expires_at, sent_to_groupme)
      VALUES (${title || null}, ${message}, ${priority || 'normal'}, ${expires_at || null}, ${send_to_groupme || false})
      RETURNING id, title, message, priority, expires_at, created_at
    `
    
    const announcement = result[0]
    
    // Send to GroupMe if requested
    if (send_to_groupme && process.env.GROUPME_BOT_ID) {
      try {
        const groupmeMessage = title ? `📢 ${title}\n\n${message}` : `📢 ${message}`
        
        await fetch('https://api.groupme.com/v3/bots/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bot_id: process.env.GROUPME_BOT_ID,
            text: groupmeMessage
          })
        })
        
        // Update that it was sent to GroupMe
        await sql`
          UPDATE announcements SET sent_to_groupme = true WHERE id = ${announcement.id}
        `
      } catch (groupmeError) {
        console.error('Failed to send to GroupMe:', groupmeError)
        // Don't fail the whole request if GroupMe fails
      }
    }
    
    return NextResponse.json(announcement)
  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
  }
}

// DELETE - Deactivate an announcement
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }
    
    await sql`
      UPDATE announcements SET is_active = false WHERE id = ${id}
    `
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting announcement:', error)
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 })
  }
}
