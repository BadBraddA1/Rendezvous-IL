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
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <SiteHeader />
      <main
        id="main-content"
        className="site-container flex min-h-0 flex-1 flex-col py-4 md:py-6"
      >
        <header className="mb-4 shrink-0 md:mb-5">
          <h1 className="text-section-title text-balance">Rendezvous Chat</h1>
          <p className="mt-2 text-lead text-muted-foreground">
            Connect with families from your event years. Each year you register for opens that
            year&apos;s group chat, and past years stay available.
          </p>
        </header>
        <div className="min-h-0 flex-1">
          <ChatPageClient currentUserId={userId} isAdmin={Boolean(admin)} />
        </div>
      </main>
    </div>
  )
}
