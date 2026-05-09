"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { Menu, LogIn } from "lucide-react"
import { Show, UserButton, SignInButton } from "@clerk/nextjs"
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

interface SiteHeaderProps {
  isHomepage?: boolean
}

export function SiteHeader({ isHomepage = false }: SiteHeaderProps) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!isHomepage) {
      setScrolled(true)
      return
    }

    const handleScroll = () => {
      // Show header after scrolling past ~80% of viewport height (near countdown)
      const threshold = window.innerHeight * 0.8
      setScrolled(window.scrollY > threshold)
    }

    handleScroll() // Check initial position
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isHomepage])

  // On homepage at top: show only hamburger menu
  if (isHomepage && !scrolled) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              aria-label="Open menu" 
              className="h-12 w-12 rounded-full bg-card/80 backdrop-blur-xl border-border/50 shadow-lg hover:bg-card"
            >
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
            <div className="mt-8 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground text-center">
                May 3-7, 2027
              </p>
              <p className="text-xs text-muted-foreground text-center mt-1">
                Lake Williamson Christian Center
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/90 backdrop-blur-xl transition-transform duration-300 ${isHomepage && !scrolled ? '-translate-y-full' : 'translate-y-0'}`}>
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
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button variant="default" size="sm" className="ml-2 gap-2">
                <LogIn className="h-4 w-4" />
                Login
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <div className="ml-3">
              <UserButton />
            </div>
          </Show>
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
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <Button variant="default" className="w-full gap-2" onClick={() => setOpen(false)}>
                    <LogIn className="h-4 w-4" />
                    Login / Sign Up
                  </Button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <div className="flex items-center justify-center gap-3">
                  <UserButton />
                  <span className="text-sm text-muted-foreground">My Account</span>
                </div>
              </Show>
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
