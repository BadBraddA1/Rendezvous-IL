"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, FileSignature, Loader2, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type SignatureRequest = {
  id: number
  role: string
  parent_name: string
  email: string
  signed_name: string | null
  signed_at: string | null
  sent_at: string | null
}

type Props = {
  registrationId: string
  /** Only full admins can resend emails / mark signed. */
  canManage: boolean
}

export function SignatureRequestsPanel({ registrationId, canManage }: Props) {
  const [requests, setRequests] = useState<SignatureRequest[] | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const { toast } = useToast()

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/registrations/${registrationId}/signatures`)
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setRequests(Array.isArray(data.requests) ? data.requests : [])
    } catch (error) {
      console.error("[signatures] Failed to load:", error)
      setRequests([])
    }
  }, [registrationId])

  useEffect(() => {
    void fetchRequests()
  }, [fetchRequests])

  const performAction = async (request: SignatureRequest, action: "resend" | "mark-signed") => {
    setBusyId(request.id)
    try {
      const res = await fetch(`/api/admin/registrations/${registrationId}/signatures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, action }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Request failed")
      }
      toast({
        title: action === "resend" ? "Signing email sent" : "Marked as signed",
        description:
          action === "resend"
            ? `A new signing email was sent to ${request.email}.`
            : `${request.parent_name} is now recorded as signed.`,
      })
      void fetchRequests()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  // Feature never used for this registration — don't clutter the page.
  if (requests !== null && requests.length === 0) return null

  const pendingCount = requests?.filter((r) => !r.signed_at).length ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-widget-heading flex items-center gap-2">
          <FileSignature className="h-4 w-4" aria-hidden="true" />
          Parent signatures
          {requests !== null && (
            <Badge variant={pendingCount > 0 ? "destructive" : "default"}>
              {pendingCount > 0 ? `${pendingCount} pending` : "Complete"}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Emailed signing links for this registration. Check-in is blocked until every signature is
          recorded.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading signatures...
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {request.signed_at ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span className="break-words">{request.parent_name}</span>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                      {request.role}
                    </Badge>
                  </p>
                  <p className="break-all text-sm text-muted-foreground">{request.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {request.signed_at
                      ? `Signed "${request.signed_name}" on ${new Date(request.signed_at).toLocaleString()}`
                      : request.sent_at
                        ? `Email sent ${new Date(request.sent_at).toLocaleString()} — not signed yet`
                        : "Email not sent yet"}
                  </p>
                </div>
                {canManage && !request.signed_at && (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void performAction(request, "resend")}
                      disabled={busyId !== null}
                    >
                      {busyId === request.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                      )}
                      Resend email
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void performAction(request, "mark-signed")}
                      disabled={busyId !== null}
                    >
                      Mark signed
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
