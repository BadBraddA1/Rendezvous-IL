"use client"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

export default function BibleBowlPage() {
  const pdfUrl = "https://yixdedkxmmcaglqi.public.blob.vercel-storage.com/REN26PP.pdf"

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="container mx-auto px-6 py-16 text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl">Bible Bowl Information</h1>
          <div className="mb-8 text-lg text-muted-foreground space-y-4">
            <p>The Bible Bowl will be open to anyone who wants to participate (from toddlers - adult).</p>
            <p>For 2027, our lessons &amp; memory work will be from the book of <strong>1 Samuel 1</strong> - the story of Hannah&apos;s faith, prayer, and dedication of Samuel to the Lord.</p>
            <p>There will be 3 levels of the test available covering the chapter summaries above:</p>
            <p>
              (1) a blank sheet of paper to be filled out, (2) a matching page, or (3) a verbal quiz for those unable to
              write. It will not be a competition but an individual testing of whether you have mastered the selected memory work above. We are
              hopeful this format will work well &amp; encourage much learning in each family.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Open Bible Bowl PDF
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a
                href="https://pewpackers.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <ExternalLink className="h-5 w-5" />
                Visit PewPackers.com
              </a>
            </Button>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
