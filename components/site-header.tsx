"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <nav className="container mx-auto flex h-20 items-center justify-between px-6">
        <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
          <Image
            src="/rendezvous-logo.png"
            alt="Rendezvous Homeschool Family Retreat"
            width={180}
            height={60}
            className="h-14 w-auto"
            priority
          />
        </Link>

        <div className="ml-auto hidden items-center gap-8 md:flex">
          <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
            Home
          </Link>
          <Link href="/schedule" className="text-sm font-medium transition-colors hover:text-primary">
            Schedule
          </Link>
          <Link href="/about" className="text-sm font-medium transition-colors hover:text-primary">
            About
          </Link>
          <Link href="/biblebowl" className="text-sm font-medium transition-colors hover:text-primary">
            Bible Bowl
          </Link>
          <Link href="/faq" className="text-sm font-medium transition-colors hover:text-primary">
            FAQ
          </Link>
          <Link href="/calculator" className="text-sm font-medium transition-colors hover:text-primary">
            Calculator
          </Link>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <nav className="flex flex-col items-center gap-8 pt-16">
              <Link
                href="/"
                className="text-xl font-medium text-center transition-colors hover:text-primary"
                onClick={() => setOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/schedule"
                className="text-xl font-medium text-center transition-colors hover:text-primary"
                onClick={() => setOpen(false)}
              >
                Schedule
              </Link>
              <Link
                href="/about"
                className="text-xl font-medium text-center transition-colors hover:text-primary"
                onClick={() => setOpen(false)}
              >
                About
              </Link>
              <Link
                href="/biblebowl"
                className="text-xl font-medium text-center transition-colors hover:text-primary"
                onClick={() => setOpen(false)}
              >
                Bible Bowl
              </Link>
              <Link
                href="/faq"
                className="text-xl font-medium text-center transition-colors hover:text-primary"
                onClick={() => setOpen(false)}
              >
                FAQ
              </Link>
              <Link
                href="/calculator"
                className="text-xl font-medium text-center transition-colors hover:text-primary"
                onClick={() => setOpen(false)}
              >
                Calculator
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  )
}
