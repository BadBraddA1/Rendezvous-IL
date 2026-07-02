import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileQuestion } from "lucide-react"
import { getBidByToken } from "@/lib/lesson-bids"
import { LessonBidClient } from "./lesson-bid-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Pick Your Lesson Topics",
  robots: { index: false, follow: false },
}

export default async function LessonBidPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const context = await getBidByToken(token)

  if (!context) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="site-container site-below-header-loose flex min-h-[50vh] items-center justify-center pb-16">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <FileQuestion className="mx-auto mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <CardTitle>Link not found</CardTitle>
              <CardDescription>
                This lesson topic link isn't valid. Try clicking the button in your email again, or
                contact the Rendezvous team for a new link.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
        <SiteFooter />
      </div>
    )
  }

  const { bid, familyLastName, topics, claimedTopic } = context

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main-content" className="site-container site-below-header-loose site-page-intro py-12">
        <LessonBidClient
          token={token}
          presenterName={bid.invitee_name}
          familyLastName={familyLastName}
          topics={topics.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            claimed: Boolean(t.claimed_by_volunteer_id),
          }))}
          initialPicks={[bid.pick_1, bid.pick_2, bid.pick_3].filter((p): p is number => p !== null)}
          alreadySubmitted={Boolean(bid.submitted_at)}
          claimedTopicTitle={claimedTopic?.title ?? null}
        />
      </main>
      <SiteFooter />
    </div>
  )
}
