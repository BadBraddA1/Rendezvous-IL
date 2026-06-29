"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Users,
  ArrowRight,
  Loader2,
  AlertCircle,
  Inbox
} from "lucide-react"
import {
  MEMBER_DIFF_FIELDS,
  formatMemberValue,
  memberFieldChanged,
  type MemberSnapshot,
} from "@/lib/pending-family-changes"

interface PendingChange {
  id: number
  family_id: number
  clerk_user_id: string
  change_type: string
  field_name?: string
  old_value?: string
  new_value?: string
  member_id?: number
  member_data?: MemberSnapshot | null
  current_member?: MemberSnapshot | null
  status: string
  submitted_at: string
  family_last_name: string
  family_email: string
  city: string
  state: string
}

interface PendingChangesClientProps {
  initialChanges: PendingChange[]
  pendingCount: number
  adminRole: string
}

export function PendingChangesClient({ 
  initialChanges, 
  pendingCount,
  adminRole 
}: PendingChangesClientProps) {
  const [changes, setChanges] = useState<PendingChange[]>(initialChanges)
  const [processing, setProcessing] = useState<number | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedChange, setSelectedChange] = useState<PendingChange | null>(null)
  const [rejectNotes, setRejectNotes] = useState("")

  const canApprove = adminRole === "admin" || adminRole === "editor"

  async function handleAction(changeId: number, action: "approve" | "reject", notes?: string) {
    setProcessing(changeId)
    try {
      const response = await fetch("/api/admin/pending-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeId, action, notes })
      })

      if (response.ok) {
        setChanges(changes.filter(c => c.id !== changeId))
        setRejectDialogOpen(false)
        setSelectedChange(null)
        setRejectNotes("")
      }
    } catch (error) {
      console.error("Error processing change:", error)
    } finally {
      setProcessing(null)
    }
  }

  function formatFieldName(field: string): string {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  function formatChangeType(type: string): string {
    switch (type) {
      case 'update_field': return 'Field Update'
      case 'add_member': return 'New Member'
      case 'update_member': return 'Member Update'
      case 'remove_member': return 'Remove Member'
      default: return type.replace(/_/g, ' ')
    }
  }

  function getChangeTypeColor(type: string): string {
    switch (type) {
      case "update_field":
        return "callout-info text-info"
      case "add_member":
        return "callout-success text-success"
      case "update_member":
        return "callout-warning text-warning"
      case "remove_member":
        return "callout-destructive text-destructive"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  if (changes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Inbox className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Pending Changes</h3>
          <p className="text-muted-foreground text-center max-w-md">
            All family profile changes have been reviewed. New changes will appear here when families update their information.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="mb-4">
        <Badge variant="secondary" className="text-sm">
          {changes.length} pending change{changes.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="space-y-4">
        {changes.map((change) => (
          <Card key={change.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-widget-heading">
                    {change.change_type.includes('member') ? (
                      <Users className="h-5 w-5" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                    {change.family_last_name} Family
                  </CardTitle>
                  <CardDescription>
                    {change.family_email} • {change.city}, {change.state}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getChangeTypeColor(change.change_type)}>
                    {formatChangeType(change.change_type)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(change.submitted_at).toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Field Update */}
              {change.change_type === 'update_field' && change.field_name && (
                <div className="p-4 rounded-lg bg-muted/50 mb-4">
                  <p className="text-sm font-medium mb-2">{formatFieldName(change.field_name)}</p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="callout-destructive rounded px-2 py-1 line-through">
                      {change.old_value || '(empty)'}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="callout-success rounded px-2 py-1">
                      {change.new_value || '(empty)'}
                    </span>
                  </div>
                </div>
              )}

              {/* Member Changes */}
              {change.member_data && (
                <MemberChangeDetails change={change} />
              )}

              {/* Actions */}
              {canApprove ? (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleAction(change.id, "approve")}
                    disabled={processing === change.id}
                    className="bg-success hover:bg-success/90"
                  >
                    {processing === change.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setSelectedChange(change)
                      setRejectDialogOpen(true)
                    }}
                    disabled={processing === change.id}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You need editor or admin permissions to approve changes.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Change</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for rejecting this change. This will be visible to the family.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection (optional)..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedChange && handleAction(selectedChange.id, "reject", rejectNotes)}
              disabled={processing === selectedChange?.id}
            >
              {processing === selectedChange?.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function MemberChangeDetails({ change }: { change: PendingChange }) {
  const proposed = change.member_data
  const current = change.current_member

  if (!proposed) return null

  const displayName = [
    proposed.first_name || current?.first_name,
    proposed.last_name || current?.last_name,
  ]
    .filter(Boolean)
    .join(" ")

  if (change.change_type === "add_member") {
    return (
      <div className="mb-4 space-y-3 rounded-lg border border-success/30 bg-success/5 p-4">
        <p className="text-sm font-medium text-success">Adding new member</p>
        <MemberSnapshotCard title={displayName || "New member"} member={proposed} />
      </div>
    )
  }

  if (change.change_type === "remove_member") {
    return (
      <div className="mb-4 space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm font-medium text-destructive">Removing member</p>
        <MemberSnapshotCard title={displayName || "Member"} member={current || proposed} />
      </div>
    )
  }

  return (
    <div className="mb-4 space-y-4 rounded-lg border bg-muted/40 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{displayName || "Member update"}</p>
          <p className="text-sm text-muted-foreground">
            Compare current profile data with the requested changes.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MemberSnapshotCard title="Current" member={current} muted />
        <MemberSnapshotCard title="Requested" member={proposed} highlight />
      </div>

      <div className="space-y-2 border-t pt-4">
        <p className="text-sm font-medium">Changes</p>
        {MEMBER_DIFF_FIELDS.filter((field) =>
          memberFieldChanged(field.key, current, proposed),
        ).map((field) => (
          <div
            key={field.key}
            className="flex flex-col gap-1 rounded-md border bg-background p-3 text-sm sm:flex-row sm:items-center sm:gap-3"
          >
            <span className="min-w-28 font-medium text-muted-foreground">
              {field.label}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-destructive/10 px-2 py-1 text-destructive line-through">
                {formatMemberValue(field.key, current?.[field.key])}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="rounded bg-success/10 px-2 py-1 text-success">
                {formatMemberValue(field.key, proposed[field.key])}
              </span>
            </div>
          </div>
        ))}
        {MEMBER_DIFF_FIELDS.every(
          (field) => !memberFieldChanged(field.key, current, proposed),
        ) && (
          <p className="text-sm text-muted-foreground">
            No field differences detected — the submitted data matches the current record.
          </p>
        )}
      </div>
    </div>
  )
}

function MemberSnapshotCard({
  title,
  member,
  muted = false,
  highlight = false,
}: {
  title: string
  member: MemberSnapshot | null | undefined
  muted?: boolean
  highlight?: boolean
}) {
  if (!member) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">{title}</p>
        <p>No member data on file.</p>
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight ? "border-warning/35 bg-warning/5" : muted ? "bg-background" : ""
      }`}
    >
      <p className="mb-3 font-medium">{title}</p>
      <dl className="space-y-2 text-sm">
        {MEMBER_DIFF_FIELDS.map((field) => (
          <div key={field.key} className="grid grid-cols-[7rem_1fr] gap-2">
            <dt className="text-muted-foreground">{field.label}</dt>
            <dd className="font-medium break-words">
              {formatMemberValue(field.key, member[field.key])}
            </dd>
          </div>
        ))}
      </dl>
      {member.special_needs && (
        <Badge variant="outline" className="mt-3 text-xs">
          <AlertCircle className="mr-1 h-3 w-3" />
          Special needs
        </Badge>
      )}
    </div>
  )
}
