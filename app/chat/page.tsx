import { SiteHeader } from "@/components/site-header"
import { ChatPageClient } from "@/components/chat/chat-page-client"
import { auth } from "@clerk/nextjs/server"
import { getCurrentAdmin } from "@/lib/clerk-auth"
import { redirect } from "next/navigation"

export default async function ChatPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect("/sign-in?redirect_url=/chat")
  }

  const admin = await getCurrentAdmin()

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="site-container py-8">
        <header className="mb-6">
          <h1 className="text-section-title text-balance">Rendezvous Chat</h1>
          <p className="mt-2 text-lead text-muted-foreground">
            Connect with families from your event years. Each year you register for opens that
            year&apos;s group chat, and past years stay available.
          </p>
        </header>
        <ChatPageClient currentUserId={userId} isAdmin={Boolean(admin)} />
      </main>
    </>
  )
}
