"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CalendarX, ArrowRight } from "lucide-react"
import Link from "next/link"

// Registration is closed — always show the closed notice until event ends.
const EVENT_END = Date.UTC(2026, 4, 8, 17, 0, 0) // May 8, 2026 12:00 PM CT

export function RegistrationPopup() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Don't show popup at all once the event is over
    if (Date.now() >= EVENT_END) return

    const hasSeenPopup = localStorage.getItem("rendezvous-popup-closed-v3")
    if (!hasSeenPopup) {
      const timer = setTimeout(() => setOpen(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem("rendezvous-popup-closed-v3", "true")
    setOpen(false)
  }

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
