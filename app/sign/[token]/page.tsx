import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileQuestion } from "lucide-react"
import { getSignatureRequestByToken } from "@/lib/signature-requests"
import { SignPageClient } from "./sign-page-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Sign Registration Agreement",
  robots: { index: false, follow: false },
}

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const context = await getSignatureRequestByToken(token)

  if (!context) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="site-container site-below-header-loose flex min-h-[50vh] items-center justify-center pb-16">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <FileQuestion className="mx-auto mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <CardTitle>Signing link not found</CardTitle>
              <CardDescription>
                This link isn't valid. It may have been copied incompletely — try clicking the
                button in your email again, or contact the Rendezvous team for a new link.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
        <SiteFooter />
      </div>
    )
  }

  const { request, familyLastName, others } = context

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main-content" className="site-container site-below-header-loose site-page-intro py-12">
        <SignPageClient
          token={token}
          parentName={request.parent_name}
          familyLastName={familyLastName}
          initialSignedName={request.signed_name}
          initialSignedAt={request.signed_at}
          initialOthers={others.map((o) => ({
            name: o.parent_name,
            signed: Boolean(o.signed_at),
          }))}
        />
      </main>
      <SiteFooter />
    </div>
  )
}
