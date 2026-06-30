import Image from "next/image"
import { MainContent } from "@/components/main-content"

export default function EODPage() {
  return (
    <MainContent className="min-h-screen bg-surface-lake flex flex-col items-center justify-center p-8">
      {/* Logo */}
      <div className="mb-12">
        <Image
          src="/rendezvous-logo.png"
          alt="Rendezvous — Christian homeschool family retreat"
          width={400}
          height={134}
          className="h-auto w-[300px] md:w-[400px]"
          priority
        />
      </div>

      {/* Next Year Info */}
      <div className="mb-16 space-y-6 text-center">
        <h1 className="hero-year text-balance text-primary">
          <span className="sr-only">Rendezvous </span>2027
        </h1>
        <p className="text-eod-dates text-foreground">May 3–7, 2027</p>
        <p className="text-lead text-muted-foreground">
          Lake Williamson Christian Center · Carlinville, IL
        </p>
      </div>

      {/* Bible Bowl */}
      <div className="w-full max-w-2xl space-y-4 border-t border-border/50 pt-8 text-center">
        <p className="text-lead text-muted-foreground">2027 Bible Bowl</p>
        <p className="text-display-hero text-balance text-brand-coral-ink">
          1 Samuel
        </p>
      </div>

      {/* Subtle footer */}
      <div className="inset-safe-bottom absolute text-center">
        <p className="text-sm text-muted-foreground/50">
          rendezvousil.com
        </p>
      </div>
    </MainContent>
  )
}
