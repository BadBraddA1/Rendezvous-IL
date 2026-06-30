import { MessagingForm } from "./messaging-form"
import { sql } from "@/lib/db"
import { auth, currentUser } from "@clerk/nextjs/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock, ShieldX } from "lucide-react"
import Link from "next/link"
import { MainContent } from "@/components/main-content"

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

type AdminRole = "admin" | "editor" | "viewer"

export default async function MessagingPage() {
  const { userId } = await auth()
  
  // Check if user is authenticated
  if (!userId) {
    return (
      <MainContent className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-subheading">Sign In Required</CardTitle>
            <CardDescription>
              You need to sign in to access the messaging page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Link href="/sign-in?redirect_url=/messaging">
              <Button>Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </MainContent>
    )
  }

  // Get user and check admin role
  const user = await currentUser()
  const publicMetadata = user?.publicMetadata as { role?: string } | undefined
  const role = publicMetadata?.role as AdminRole | undefined

  if (!role || !["admin", "editor"].includes(role)) {
    return (
      <MainContent className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <ShieldX className="h-7 w-7 text-destructive" />
            </div>
            <CardTitle className="text-subheading">Access Denied</CardTitle>
            <CardDescription>
              You need admin or editor permissions to access the messaging page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-4">
            <Link href="/">
              <Button variant="outline">Go Home</Button>
            </Link>
            <Link href="/account">
              <Button>My Account</Button>
            </Link>
          </CardContent>
        </Card>
      </MainContent>
    )
  }

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
    <MainContent belowHeader="loose" className="min-h-[100dvh] bg-background">
      <div className="site-container space-y-6 py-6 md:py-8">
        <header className="admin-page-header">
          <h1 className="text-section-title text-balance">Messaging & Announcements</h1>
          <p className="text-lead text-muted-foreground">Send messages to GroupMe and display announcements on /LU and /schedule</p>
        </header>

        <MessagingForm initialAnnouncements={announcements} />
      </div>
    </MainContent>
  )
}
