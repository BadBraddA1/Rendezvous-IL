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

interface PendingChange {
  id: number
  family_id: number
  clerk_user_id: string
  change_type: string
  field_name?: string
  old_value?: string
  new_value?: string
  member_id?: number
  member_data?: {
    first_name: string
    last_name: string
    member_type: string
    age_group: string
    gender: string
    grade?: string
    special_needs?: boolean
    notes?: string
  }
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
      case 'update_field': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'add_member': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'update_member': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
      case 'remove_member': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
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
                  <CardTitle className="text-lg flex items-center gap-2">
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
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded dark:bg-red-900/50 dark:text-red-200 line-through">
                      {change.old_value || '(empty)'}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded dark:bg-green-900/50 dark:text-green-200">
                      {change.new_value || '(empty)'}
                    </span>
                  </div>
                </div>
              )}

              {/* Member Changes */}
              {change.member_data && (
                <div className="p-4 rounded-lg bg-muted/50 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {change.member_data.first_name} {change.member_data.last_name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {change.member_data.member_type}
                        </Badge>
                        <span>{change.member_data.age_group}</span>
                        <span>• {change.member_data.gender}</span>
                        {change.member_data.grade && (
                          <span>• Grade {change.member_data.grade}</span>
                        )}
                      </div>
                      {change.member_data.special_needs && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Special needs
                        </Badge>
                      )}
                      {change.member_data.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Notes: {change.member_data.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              {canApprove ? (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleAction(change.id, "approve")}
                    disabled={processing === change.id}
                    className="bg-green-600 hover:bg-green-700"
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
