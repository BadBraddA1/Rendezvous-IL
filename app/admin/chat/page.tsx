import { AdminNav } from "@/components/admin/admin-nav"
import { AdminChatManager } from "@/components/admin/admin-chat-manager"
import { getCurrentAdmin, isAuthenticated } from "@/lib/clerk-auth"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function AdminChatPage() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect("/sign-in?redirect_url=/admin/chat")
  }

  const admin = await getCurrentAdmin()
  if (!admin) {
    redirect("/admin")
  }

  const { userId } = await auth()
  if (!userId) {
    redirect("/sign-in?redirect_url=/admin/chat")
  }

  return (
    <div className="admin-shell">
      <AdminNav currentPage="chat" admin={admin} />
      <main id="main-content" className="admin-main">
        <div className="admin-container">
          <header className="admin-page-header">
            <h1 className="text-section-title text-balance">Year Chat</h1>
            <p className="text-lead text-muted-foreground">
              Manage Rendezvous group chats by event year, create test channels, and message
              attendees from the web.
            </p>
          </header>
          <AdminChatManager currentUserId={userId} canEdit={admin.role !== "viewer"} />
        </div>
      </main>
    </div>
  )
}
