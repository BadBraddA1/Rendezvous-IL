import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { BookOpen, ExternalLink } from "lucide-react"

export default function BibleBowlPage() {
  const pdfUrl = "https://yixdedkxmmcaglqi.public.blob.vercel-storage.com/REN26PP.pdf"

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main
        id="main-content"
        className="site-container section-sm flex-1 pb-16 pt-[calc(5.5rem+env(safe-area-inset-top,0px))] md:pb-20"
      >
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface-highlight">
            <BookOpen className="h-8 w-8 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-page-title mb-6 text-balance">Bible Bowl</h1>
          <div className="measure-prose mx-auto mb-8 space-y-4 text-left text-muted-foreground">
            <p>
              Bible Bowl is open to anyone who wants to participate, from toddlers through adults.
            </p>
            <p>
              For 2027, lessons and memory work will be from the book of <strong className="text-foreground">1 Samuel</strong>.
            </p>
            <p>Three levels of the test are available:</p>
            <ol className="list-decimal space-y-2 pl-6">
              <li>A blank sheet to fill out</li>
              <li>A matching page</li>
              <li>A verbal quiz for those unable to write</li>
            </ol>
            <p>
              It is not a competition but an individual check of whether you have mastered the selected memory work.
              We hope this format encourages learning together as families.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Button asChild size="lg" className="h-11 gap-2">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-5 w-5" aria-hidden="true" />
                Open Bible Bowl PDF
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 gap-2 border-primary/25">
              <a href="https://pewpackers.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-5 w-5" aria-hidden="true" />
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
