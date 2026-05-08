import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Calendar, MapPin, Users } from "lucide-react"

export default function RegistrationSuccessPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-lg">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Registration Complete!</CardTitle>
              <CardDescription>
                Thank you for registering for Rendezvous 2027. We can&apos;t wait to see you there!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-muted p-4 text-left">
                <h3 className="mb-3 font-semibold">Event Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>May 3-7, 2027 (Monday - Friday)</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Lake Williamson Christian Center, Carlinville, IL</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Theme: 1 Samuel</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-left">
                <h3 className="mb-2 font-semibold text-primary">What&apos;s Next?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• You&apos;ll receive a confirmation email shortly</li>
                  <li>• Payment information will be sent separately</li>
                  <li>• Start studying 1 Samuel for Bible Bowl!</li>
                  <li>• Join our Facebook group for updates</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/schedule" className="flex-1">
                  <Button variant="outline" className="w-full">
                    View Schedule
                  </Button>
                </Link>
                <Link href="/" className="flex-1">
                  <Button className="w-full">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
