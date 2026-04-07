"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CalendarX, ArrowRight, Calendar } from "lucide-react"
import Link from "next/link"

const REGISTRATION_DEADLINE = Date.UTC(2026, 3, 15, 16, 59, 0)
const EVENT_START = Date.UTC(2026, 4, 4, 18, 0, 0)

type PopupPhase = "open" | "closed" | "live-or-past"

function getPopupPhase(now: number): PopupPhase {
  if (now < REGISTRATION_DEADLINE) return "open"
  if (now < EVENT_START) return "closed"
  return "live-or-past"
}

export function RegistrationPopup() {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<PopupPhase>("closed")

  useEffect(() => {
    const currentPhase = getPopupPhase(Date.now())
    setPhase(currentPhase)

    // Don't show popup if event is live or past
    if (currentPhase === "live-or-past") return

    const hasSeenPopup = localStorage.getItem("rendezvous-registration-popup-seen-v2")
    if (!hasSeenPopup) {
      const timer = setTimeout(() => setOpen(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem("rendezvous-registration-popup-seen-v2", "true")
    setOpen(false)
  }

  if (phase === "live-or-past") return null

  // ── Registration Open ──
  if (phase === "open") {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-center text-2xl font-bold">Registration is Open!</DialogTitle>
            <DialogDescription className="text-center text-base">
              Secure your spot for Rendezvous 2026 at Lake Williamson Christian Center.
              <br />
              <span className="mt-2 block font-semibold text-foreground">May 4–8, 2026</span>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <Button asChild className="w-full" size="lg" onClick={handleClose}>
              <Link href="/registration">
                Register Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleClose}>
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Registration Closed ──
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
            <CalendarX className="h-8 w-8 text-amber-600" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold">Registration is Closed</DialogTitle>
          <DialogDescription className="text-center text-base">
            The registration deadline has passed, but Rendezvous 2026 is right around the corner!
            <br />
            <span className="mt-2 block font-semibold text-foreground">May 4–8, 2026</span>
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-3">
          <Button asChild className="w-full" size="lg" variant="outline" onClick={handleClose}>
            <Link href="/schedule">
              View Schedule
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
