"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Send, Mail, Users, CheckCircle } from "lucide-react"
import { toast } from "sonner"

export function MessagingClient() {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [recipient, setRecipient] = useState("all")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  async function handleSend() {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in subject and message")
      return
    }

    setSending(true)
    try {
      const response = await fetch("/api/admin/messaging/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient,
          subject,
          message,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to send")
      }

      const data = await response.json()
      setSent(true)
      toast.success(`Email sent to ${data.recipientCount} families`)
      
      // Reset form after delay
      setTimeout(() => {
        setSent(false)
        setSubject("")
        setMessage("")
      }, 3000)
    } catch (error) {
      console.error("Error sending email:", error)
      toast.error("Failed to send email")
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-highlight">
            <CheckCircle className="h-8 w-8 text-success" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Email Sent Successfully</h3>
          <p className="text-muted-foreground text-center">
            Your message has been sent to all selected recipients.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Compose Email
          </CardTitle>
          <CardDescription>
            Send an email to registered families
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipients</Label>
            <Select value={recipient} onValueChange={setRecipient}>
              <SelectTrigger>
                <SelectValue placeholder="Select recipients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Registered Families</SelectItem>
                <SelectItem value="unpaid">Families with Unpaid Balance</SelectItem>
                <SelectItem value="paid">Fully Paid Families</SelectItem>
                <SelectItem value="motel">Motel Lodging</SelectItem>
                <SelectItem value="rv">RV Lodging</SelectItem>
                <SelectItem value="tent">Tent Lodging</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Write your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
            />
          </div>

          <Button 
            onClick={handleSend} 
            disabled={sending || !subject.trim() || !message.trim()}
            className="w-full"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Email Templates
          </CardTitle>
          <CardDescription>
            Quick templates for common messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => {
              setSubject("Payment Reminder - Rendezvous IL 2027")
              setMessage(`Dear Rendezvous Family,

This is a friendly reminder that your registration balance is still outstanding. Please complete your payment at your earliest convenience to secure your spot.

You can make a payment by logging into your account at rendezvousil.com/account.

If you have any questions, please don't hesitate to reach out.

Blessings,
The Rendezvous IL Team`)
            }}
          >
            Payment Reminder
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => {
              setSubject("Important Update - Rendezvous IL 2027")
              setMessage(`Dear Rendezvous Family,

We have an important update to share with you regarding this year's event.

[Your update here]

Thank you for being part of our Rendezvous family!

Blessings,
The Rendezvous IL Team`)
            }}
          >
            General Announcement
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => {
              setSubject("See You Soon! - Rendezvous IL 2027")
              setMessage(`Dear Rendezvous Family,

We're so excited that the event is almost here! Here are some last-minute reminders:

• Check-in begins at 3:00 PM on [date]
• Don't forget to bring [items]
• Weather forecast: [weather]

We can't wait to see you!

Blessings,
The Rendezvous IL Team`)
            }}
          >
            Pre-Event Reminder
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => {
              setSubject("Thank You! - Rendezvous IL 2027")
              setMessage(`Dear Rendezvous Family,

Thank you so much for joining us at this year's Rendezvous IL! We hope you had an amazing time of fellowship, worship, and fun.

We'd love to hear your feedback. Please take a moment to share your thoughts and suggestions for next year.

Until next time!

Blessings,
The Rendezvous IL Team`)
            }}
          >
            Post-Event Thank You
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
