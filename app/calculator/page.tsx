import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Construction, ArrowLeft } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { EmailSignupForm } from "@/components/email-signup-form"
import Link from "next/link"

export default function CalculatorPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight md:text-5xl">Lodging Cost Calculator</h1>
            <p className="text-balance text-lg text-muted-foreground">Estimate your total cost for Rendezvous</p>
          </div>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Construction className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Under Construction</CardTitle>
              <CardDescription className="text-base">
                We&apos;re building something new for 2027
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-muted-foreground">
                The lodging cost calculator is currently being updated with new pricing and options for Rendezvous 2027.
              </p>

              <EmailSignupForm />

              <p className="text-sm text-muted-foreground">
                For questions about pricing or registration for future events, please contact the event organizers through our Facebook group.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button asChild>
                  <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>
                <Button variant="outline" asChild className="bg-transparent">
                  <a 
                    href="https://www.facebook.com/groups/RendezvousIL" 
                    target="_blank" 
                    rel="noreferrer noopener"
                  >
                    Join Facebook Group
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
