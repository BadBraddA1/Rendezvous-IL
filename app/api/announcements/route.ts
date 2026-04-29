import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const announcements = await sql`
      SELECT 
        id,
        title,
        message,
        priority,
        is_active,
        show_on_live_updates,
        show_on_schedule,
        created_at,
        expires_at
      FROM announcements
      WHERE is_active = true
        AND show_on_live_updates = true
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY 
        CASE priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'normal' THEN 3 
          WHEN 'low' THEN 4 
          ELSE 5 
        END,
        created_at DESC
      LIMIT 10
    `
    
    return NextResponse.json({ announcements })
  } catch (error) {
    console.error("Failed to fetch announcements:", error)
    return NextResponse.json({ announcements: [], error: "Failed to fetch announcements" }, { status: 500 })
  }
}
