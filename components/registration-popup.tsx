"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar, ArrowRight } from "lucide-react"
import Link from "next/link"

export function RegistrationPopup() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Check if user has seen the popup before
    const hasSeenPopup = localStorage.getItem("rendezvous-registration-popup-seen")

    if (!hasSeenPopup) {
      // Show popup after a short delay for better UX
      const timer = setTimeout(() => {
        setOpen(true)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    // Mark popup as seen in localStorage
    localStorage.setItem("rendezvous-registration-popup-seen", "true")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold">Rendezvous 2027 is Coming!</DialogTitle>
          <DialogDescription className="text-center text-base">
            Registration opens January 1, 2027 for Rendezvous 2027 at Lake Williamson Christian Center.
            <br />
            <span className="mt-2 block font-semibold text-foreground">May 3-7, 2027 | Theme: 1 Samuel 1</span>
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
