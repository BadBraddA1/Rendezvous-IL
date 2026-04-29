import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { AdminNav } from "@/components/admin/admin-nav"
import { MessagingForm } from "./messaging-form"
import { sql } from "@/lib/db"

interface Announcement {
  id: number
  title: string
  message: string
  priority: string
  is_active: boolean
  show_on_live_updates: boolean
  show_on_schedule: boolean
  sent_to_groupme: boolean
  groupme_message_id: string | null
  created_at: string
  expires_at: string | null
  created_by: string | null
}

export default async function MessagingPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("admin_session")

  if (!sessionCookie || sessionCookie.value !== "authenticated") {
    redirect("/admin/login")
  }

  const admin = { email: "admin@braddcorp.com", role: "admin" }

  // Fetch existing announcements
  let announcements: Announcement[] = []
  
  try {
    announcements = await sql`
      SELECT 
        id, title, message, priority, is_active, 
        show_on_live_updates, show_on_schedule, 
        sent_to_groupme, groupme_message_id,
        created_at, expires_at, created_by
      FROM announcements
      ORDER BY created_at DESC
      LIMIT 50
    `
  } catch (error) {
    console.error("[v0] Error fetching announcements:", error)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNav currentPage="messaging" admin={admin} />

      <main className="flex-1 bg-background p-6">
        <div className="container mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Messaging & Announcements</h2>
            <p className="text-muted-foreground">Send messages to GroupMe and display announcements on /LU and /schedule</p>
          </div>

          <MessagingForm initialAnnouncements={announcements} />
        </div>
      </main>
    </div>
  )
}
