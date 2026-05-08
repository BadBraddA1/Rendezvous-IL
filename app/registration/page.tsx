import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Clock } from "lucide-react"
import Link from "next/link"

export default function RegistrationPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-24 md:py-32">
        <Card className="mx-auto max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Registration Coming Soon</CardTitle>
            <CardDescription>
              Registration for Rendezvous 2027 opens January 1, 2027
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-left">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>May 3-7, 2027 (Monday - Friday)</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Lake Williamson Christian Center, Carlinville, IL</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Check back on January 1st to register your family for this year&apos;s retreat!
            </p>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  )
}
