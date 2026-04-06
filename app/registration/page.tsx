"use client"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle, Mail, Phone } from "lucide-react"
import Link from "next/link"

export default function RegistrationPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-12">
        <div className="mx-auto w-full max-w-xl text-center">
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-9 w-9 text-red-600" />
              </div>
              <CardTitle className="text-3xl font-bold">Registration is Closed</CardTitle>
              <CardDescription className="text-base mt-2">
                Online registration for Rendezvous 2026 has closed. We look forward to seeing everyone at Lake
                Williamson Christian Center, May 4-8, 2026!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                If you have questions about your existing registration or need assistance, please contact us directly.
              </p>
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 text-left">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  <a href="mailto:Stephen@Bradd.us" className="text-sm hover:underline">
                    Stephen@Bradd.us
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <a href="tel:2179355058" className="text-sm hover:underline">
                    (217) 935-5058
                  </a>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link href="/map2026">See Who&apos;s Coming</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
