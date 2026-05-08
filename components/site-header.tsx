"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Menu, LogIn } from "lucide-react"
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/schedule", label: "Schedule" },
  { href: "/about", label: "About" },
  { href: "/biblebowl", label: "Bible Bowl" },
  { href: "/faq", label: "FAQ" },
  { href: "/calculator", label: "Calculator" },
  { href: "/map2027", label: "Attendee" },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/90 backdrop-blur-xl">
      <nav className="container mx-auto flex h-16 md:h-20 items-center justify-between px-6">
        <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
          <Image
            src="/rendezvous-logo.png"
            alt="Rendezvous Homeschool Family Retreat"
            width={160}
            height={53}
            className="h-10 md:h-12 w-auto"
            priority
          />
        </Link>

        <div className="ml-auto hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground rounded-lg hover:bg-secondary"
            >
              {link.label}
            </Link>
          ))}
          <SignedOut>
            <Link href="/sign-in">
              <Button variant="default" size="sm" className="ml-2 gap-2">
                <LogIn className="h-4 w-4" />
                Login
              </Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <div className="ml-3">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu" className="text-foreground">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:w-[400px] bg-background border-border">
            <div className="flex items-center justify-between mb-8">
              <Image
                src="/rendezvous-logo.png"
                alt="Rendezvous"
                width={140}
                height={47}
                className="h-10 w-auto"
              />
            </div>
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center px-4 py-3 text-lg font-medium text-foreground transition-colors hover:text-primary hover:bg-secondary/50 rounded-lg"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-6 pt-6 border-t border-border">
              <SignedOut>
                <Link href="/sign-in" onClick={() => setOpen(false)}>
                  <Button variant="default" className="w-full gap-2">
                    <LogIn className="h-4 w-4" />
                    Login / Sign Up
                  </Button>
                </Link>
              </SignedOut>
              <SignedIn>
                <div className="flex items-center justify-center gap-3">
                  <UserButton afterSignOutUrl="/" />
                  <span className="text-sm text-muted-foreground">My Account</span>
                </div>
              </SignedIn>
            </div>
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground text-center">
                May 3-7, 2027
              </p>
              <p className="text-xs text-muted-foreground text-center mt-1">
                Lake Williamson Christian Center
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  )
}
