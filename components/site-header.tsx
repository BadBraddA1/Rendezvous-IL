"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { LogoutIcon, MenuIcon, MessageCircleIcon, UserIcon } from "@/components/icons"
import { useAuth, useClerk } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { UserMenuButton } from "@/components/user-menu-button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

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

/**
 * Clerk hooks must not run during SSR of page-level chrome.
 * Server Actions (incl. Clerk's invalidateCacheAction on sign-in/out) can
 * re-render the page segment without layout ClerkProvider context — `<Show>`
 * then throws (RENDEZVOUS-IL-2). Gate on mount so auth UI only runs client-side.
 */
function useClientAuth() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

function DesktopAuthControls() {
  const mounted = useClientAuth()
  if (!mounted) {
    return (
      <div className="ml-2 flex min-h-11 min-w-[5.5rem] items-center border-l border-border pl-2" aria-hidden />
    )
  }
  return <DesktopAuthControlsInner />
}

function DesktopAuthControlsInner() {
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) {
    return (
      <div className="ml-2 flex min-h-11 min-w-[5.5rem] items-center border-l border-border pl-2" aria-hidden />
    )
  }
  return (
    <div className="ml-2 border-l border-border pl-2">
      {isSignedIn ? (
        <UserMenuButton size="sm" afterSignOutUrl="/" />
      ) : (
        <Link href="/sign-in">
          <Button variant="ghost" className="min-h-11 gap-2 px-4">
            <UserIcon size={16} aria-hidden />
            Sign In
          </Button>
        </Link>
      )}
    </div>
  )
}

function MobileAuthControls({ onNavigate }: { onNavigate: () => void }) {
  const mounted = useClientAuth()
  if (!mounted) return null
  return <MobileAuthControlsInner onNavigate={onNavigate} />
}

function MobileAuthControlsInner({ onNavigate }: { onNavigate: () => void }) {
  const { isLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  if (!isLoaded) return null

  if (isSignedIn) {
    return (
      <div className="space-y-2 px-4 py-3">
        <Link
          href="/chat"
          className="focus-ring flex min-h-11 items-center gap-3 rounded-lg p-3 transition-colors hover:bg-secondary/50 active:bg-secondary/50"
          onClick={onNavigate}
        >
          <MessageCircleIcon size={20} className="text-primary" />
          <div>
            <p className="text-sm font-medium">Chat</p>
            <p className="text-xs text-muted-foreground">Message your event years</p>
          </div>
        </Link>
        <Link
          href="/account"
          className="focus-ring flex min-h-11 items-center gap-3 rounded-lg p-3 transition-colors hover:bg-secondary/50 active:bg-secondary/50"
          onClick={onNavigate}
        >
          <UserIcon size={20} className="text-primary" />
          <div>
            <p className="text-sm font-medium">My Account</p>
            <p className="text-xs text-muted-foreground">View your dashboard</p>
          </div>
        </Link>
        <button
          type="button"
          className="focus-ring flex min-h-11 w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-destructive/10 active:bg-destructive/10"
          onClick={() => {
            onNavigate()
            void signOut({ redirectUrl: "/" })
          }}
        >
          <LogoutIcon size={20} className="text-destructive" />
          <p className="text-sm font-medium text-destructive">Sign Out</p>
        </button>
      </div>
    )
  }

  return (
    <Link
      href="/sign-in"
      className="focus-ring flex min-h-11 items-center gap-2 rounded-lg px-4 py-3 text-lg font-medium text-primary transition-colors hover:bg-secondary/50 active:bg-secondary/50"
      onClick={onNavigate}
    >
      <UserIcon size={20} />
      Sign In
    </Link>
  )
}

function MobileNav({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild className="lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          className="touch-target h-11 w-11 text-foreground"
        >
          <MenuIcon size={24} />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto border-border bg-background sm:w-[400px]">
        <div className="mb-8 flex items-center justify-center">
          <Image src="/rendezvous-logo.png" alt="Rendezvous" width={140} height={47} className="h-10 w-auto" />
        </div>
        <nav className="flex flex-col gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-11 items-center rounded-lg px-4 py-3 text-lg font-medium text-foreground transition-colors hover:bg-secondary/50 hover:text-primary active:bg-secondary"
              onClick={() => onOpenChange(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-border pt-6">
          <MobileAuthControls onNavigate={() => onOpenChange(false)} />
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-center text-sm text-muted-foreground">May 3–7, 2027</p>
          <p className="mt-1 text-center text-xs text-muted-foreground">Lake Williamson Christian Center</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function SiteHeader({ isHomepage = false }: SiteHeaderProps) {
  const [open, setOpen] = useState(false)
  const [atTop, setAtTop] = useState(isHomepage)

  useEffect(() => {
    if (!isHomepage) {
      setAtTop(false)
      return
    }

    const handleScroll = () => setAtTop(window.scrollY < 16)
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isHomepage])

  return (
    <>
    <header
      className={cn(
        "site-chrome-top z-layer-chrome fixed top-0 right-0 left-0 border-b transition-colors duration-300",
        isHomepage && atTop ? "border-transparent bg-background/90" : "border-primary/15 bg-card",
      )}
    >
      <nav className="site-container flex h-[var(--site-header-height)] items-center justify-between">
        <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
          <Image
            src="/rendezvous-logo.png"
            alt="Rendezvous Homeschool Family Retreat"
            width={160}
            height={53}
            className="h-9 w-auto md:h-11"
            priority
          />
        </Link>

        <div className="ml-auto hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="focus-ring inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground xl:px-4"
            >
              {link.label}
            </Link>
          ))}
          <DesktopAuthControls />
        </div>

        <MobileNav open={open} onOpenChange={setOpen} />
      </nav>
    </header>
    <div className="site-header-spacer" aria-hidden="true" />
    </>
  )
}
