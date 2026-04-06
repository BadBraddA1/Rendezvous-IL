"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

type Props = {
  open: boolean
  onClose: () => void
  registrations: any[]
  selectedIds: string[]
}

export function BulkEmailModal({ open, onClose, registrations, selectedIds }: Props) {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const { toast } = useToast()

  const recipientCount = selectedIds.length > 0 ? selectedIds.length : registrations.length

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both subject and message.",
        variant: "destructive",
      })
      return
    }

    setSending(true)
    try {
      const res = await fetch("/api/admin/registrations/send-bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          message,
          registrationIds: selectedIds.length > 0 ? selectedIds : undefined,
        }),
      })

      if (!res.ok) throw new Error("Failed to send emails")

      const data = await res.json()

      toast({
        title: "Emails sent successfully",
        description: `${data.sent} email(s) sent to registrants.`,
      })

      setSubject("")
      setMessage("")
      onClose()
    } catch (error) {
      toast({
        title: "Error sending emails",
        description: "Some emails may not have been delivered.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Bulk Email</DialogTitle>
          <DialogDescription>
            Send an email to {recipientCount} {recipientCount === 1 ? "family" : "families"}
            {selectedIds.length > 0 ? " (selected)" : " (all registrations)"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="e.g., Important Rendezvous Update"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
            />
            <p className="mt-1 text-sm text-muted-foreground">
              This will be sent from noreply@braddcorp.com to all selected families.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? "Sending..." : `Send to ${recipientCount} ${recipientCount === 1 ? "Family" : "Families"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
