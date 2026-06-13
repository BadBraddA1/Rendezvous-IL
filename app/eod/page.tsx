import Image from "next/image"
import { MainContent } from "@/components/main-content"

export default function EODPage() {
  return (
    <MainContent className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex flex-col items-center justify-center p-8">
      {/* Logo */}
      <div className="mb-12">
        <Image
          src="/rendezvous-logo.png"
          alt="Rendezvous"
          width={400}
          height={134}
          className="h-auto w-[300px] md:w-[400px]"
          priority
        />
      </div>

      {/* Next Year Info */}
      <div className="text-center space-y-6 mb-16">
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold text-primary">
          2027
        </h1>
        <p className="text-3xl md:text-5xl lg:text-6xl font-medium text-foreground">
          May 3-7
        </p>
        <p className="text-xl md:text-3xl lg:text-4xl text-muted-foreground">
          Lake Williamson Christian Center
        </p>
      </div>

      {/* Bible Bowl */}
      <div className="text-center space-y-4 pt-8 border-t border-border/50 w-full max-w-2xl">
        <p className="text-lg md:text-2xl text-muted-foreground uppercase tracking-widest">
          Next Bible Bowl
        </p>
        <p className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground">
          1 Samuel
        </p>
      </div>

      {/* Subtle footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-sm text-muted-foreground/50">
          rendezvousil.com
        </p>
      </div>
    </MainContent>
  )
}
