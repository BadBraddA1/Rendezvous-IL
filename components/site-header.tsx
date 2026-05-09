"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { Menu, User, Users, Shield } from "lucide-react"
import { Show, UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/schedule", label: "Schedule" },
  { href: "/about", label: "About" },
  { href: "/biblebowl", label: "Bible Bowl" },
  { href: "/faq", label: "FAQ" },
  { href: "/calculator", label: "Calculator" },
  { href: "/map2026", label: "Attendee" },
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
            <div className="mt-6 pt-6 border-t border-border">
              <Show when="signed-in">
                <div className="flex items-center gap-3 px-4 py-3">
                  <UserButton 
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "h-10 w-10"
                      }
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">My Account</p>
                    <Link 
                      href="/account" 
                      className="text-xs text-primary hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      View Dashboard
                    </Link>
                  </div>
                </div>
              </Show>
              <Show when="signed-out">
                <Link
                  href="/sign-in"
                  className="flex items-center gap-2 px-4 py-3 text-lg font-medium text-primary transition-colors hover:bg-secondary/50 rounded-lg"
                  onClick={() => setOpen(false)}
                >
                  <User className="h-5 w-5" />
                  Sign In
                </Link>
              </Show>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
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
          <div className="ml-2 pl-2 border-l border-border">
            <Show when="signed-in">
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-9 w-9"
                  }
                }}
              >
                <UserButton.MenuItems>
                  <UserButton.Link label="Dashboard" href="/account" labelIcon={<User className="h-4 w-4" />} />
                  <UserButton.Link label="Family Profile" href="/account/profile" labelIcon={<Users className="h-4 w-4" />} />
                  <UserButton.Link label="Admin Dashboard" href="/admin" labelIcon={<Shield className="h-4 w-4" />} />
                </UserButton.MenuItems>
              </UserButton>
            </Show>
            <Show when="signed-out">
              <Link href="/sign-in">
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            </Show>
          </div>
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
              <Show when="signed-in">
                <div className="flex items-center gap-3 px-4 py-3">
                  <UserButton 
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "h-10 w-10"
                      }
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">My Account</p>
                    <Link 
                      href="/account" 
                      className="text-xs text-primary hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      View Dashboard
                    </Link>
                  </div>
                </div>
              </Show>
              <Show when="signed-out">
                <Link
                  href="/sign-in"
                  className="flex items-center gap-2 px-4 py-3 text-lg font-medium text-primary transition-colors hover:bg-secondary/50 rounded-lg"
                  onClick={() => setOpen(false)}
                >
                  <User className="h-5 w-5" />
                  Sign In
                </Link>
              </Show>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
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
