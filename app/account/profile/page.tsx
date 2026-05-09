"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { 
  User, 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  Church,
  Save,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Home
} from "lucide-react"

interface FamilyMember {
  id?: number
  first_name: string
  last_name: string
  member_type: string
  age_group: string
  grade?: string
  gender: string
  special_needs?: boolean
  notes?: string
}

interface Family {
  id: number
  family_last_name: string
  husband_first?: string
  husband_last?: string
  wife_first?: string
  wife_last?: string
  email: string
  husband_phone?: string
  wife_phone?: string
  street?: string
  city: string
  state: string
  zip: string
  home_congregation: string
  members: FamilyMember[]
}

interface PendingChange {
  id: number
  change_type: string
  field_name?: string
  old_value?: string
  new_value?: string
  member_data?: FamilyMember
  status: string
  submitted_at: string
}

export default function FamilyProfilePage() {
  const { user, isLoaded } = useUser()
  const [family, setFamily] = useState<Family | null>(null)
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(true)
  const [editedFamily, setEditedFamily] = useState<Partial<Family>>({})
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    if (isLoaded && user) {
      fetchProfile()
    } else if (isLoaded && !user) {
      setLoading(false)
    }
  }, [isLoaded, user])

  async function fetchProfile() {
    try {
      console.log("[v0] Fetching family profile...")
      const response = await fetch("/api/family/profile")
      const data = await response.json()
      console.log("[v0] Profile data received:", data)
      setFamily(data.family)
      setPendingChanges(data.pendingChanges || [])
      if (data.family) {
        setEditedFamily(data.family)
      }
    } catch (error) {
      console.error("[v0] Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveProfile() {
    setSaving(true)
    try {
      const response = await fetch("/api/family/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedFamily)
      })
      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage(`${data.changesCount} change(s) submitted for admin approval`)
        setIsEditing(false)
        fetchProfile()
        setTimeout(() => setSuccessMessage(""), 5000)
      }
    } catch (error) {
      console.error("Error saving profile:", error)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveMember(member: FamilyMember) {
    setSaving(true)
    try {
      const response = await fetch("/api/family/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(member)
      })
      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage(data.message)
        setMemberDialogOpen(false)
        setEditingMember(null)
        fetchProfile()
        setTimeout(() => setSuccessMessage(""), 5000)
      }
    } catch (error) {
      console.error("Error saving member:", error)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveMember(memberId: number) {
    setSaving(true)
    try {
      const response = await fetch("/api/family/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId })
      })
      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage(data.message)
        fetchProfile()
        setTimeout(() => setSuccessMessage(""), 5000)
      }
    } catch (error) {
      console.error("Error removing member:", error)
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>Please sign in to view your family profile</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/sign-in?redirect_url=/account/profile">
                <Button className="w-full">Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!family) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/account" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <Card>
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>No Family Profile Found</CardTitle>
              <CardDescription>
                Your account is not linked to a family registration yet. 
                Please register for Rendezvous to create your family profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Link href="/registration">
                <Button className="w-full">Register Now</Button>
              </Link>
              <Link href="/account">
                <Button variant="outline" className="w-full">Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/account">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Family Profile</h1>
            <p className="text-muted-foreground">Manage your family information</p>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 dark:bg-green-950/20 dark:border-green-900">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <p className="text-green-800 dark:text-green-200">{successMessage}</p>
          </div>
        )}

        {/* Pending Changes Alert */}
        {pendingChanges.length > 0 && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <Clock className="h-5 w-5" />
                Pending Changes
              </CardTitle>
              <CardDescription className="text-amber-700 dark:text-amber-300">
                You have {pendingChanges.length} change(s) awaiting admin approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingChanges.map((change) => (
                  <div key={change.id} className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                    <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
                      {change.change_type.replace(/_/g, ' ')}
                    </Badge>
                    {change.field_name && (
                      <span>
                        {change.field_name.replace(/_/g, ' ')}: &quot;{change.old_value}&quot; → &quot;{change.new_value}&quot;
                      </span>
                    )}
                    {change.member_data && (
                      <span>
                        {change.member_data.first_name} {change.member_data.last_name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Family Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Family Information
                </CardTitle>
                <CardDescription>Contact details and address</CardDescription>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Family Name */}
            <div className="space-y-2">
              <Label>Family Name</Label>
              <Input
                value={editedFamily.family_last_name || ""}
                onChange={(e) => setEditedFamily({ ...editedFamily, family_last_name: e.target.value })}
              />
            </div>

            <Separator />

            {/* Contact Info */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Information
              </Label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editedFamily.email || ""}
                    onChange={(e) => setEditedFamily({ ...editedFamily, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="husband_phone">Husband&apos;s Phone</Label>
                  <Input
                    id="husband_phone"
                    type="tel"
                    value={editedFamily.husband_phone || ""}
                    onChange={(e) => setEditedFamily({ ...editedFamily, husband_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wife_phone">Wife&apos;s Phone</Label>
                  <Input
                    id="wife_phone"
                    type="tel"
                    value={editedFamily.wife_phone || ""}
                    onChange={(e) => setEditedFamily({ ...editedFamily, wife_phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Address */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Address
              </Label>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={editedFamily.street || ""}
                    onChange={(e) => setEditedFamily({ ...editedFamily, street: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={editedFamily.city || ""}
                      onChange={(e) => setEditedFamily({ ...editedFamily, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={editedFamily.state || ""}
                      onChange={(e) => setEditedFamily({ ...editedFamily, state: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      value={editedFamily.zip || ""}
                      onChange={(e) => setEditedFamily({ ...editedFamily, zip: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Home Congregation */}
            <div className="space-y-2">
              <Label htmlFor="congregation" className="flex items-center gap-2">
                <Church className="h-4 w-4" />
                Home Congregation
              </Label>
              <Input
                id="congregation"
                value={editedFamily.home_congregation || ""}
                onChange={(e) => setEditedFamily({ ...editedFamily, home_congregation: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Family Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Family Members
                </CardTitle>
                <CardDescription>
                  {family.members?.length || 0} member(s) in your family
                </CardDescription>
              </div>
              <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingMember(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <MemberDialog 
                  member={editingMember}
                  onSave={handleSaveMember}
                  saving={saving}
                />
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {family.members && family.members.length > 0 ? (
              <div className="space-y-3">
                {family.members.map((member) => (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {member.first_name} {member.last_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">
                            {member.member_type}
                          </Badge>
                          <span>{member.age_group}</span>
                          {member.grade && <span>• Grade {member.grade}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setEditingMember(member)
                          setMemberDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Family Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {member.first_name} {member.last_name} from your family? 
                              This will be submitted for admin approval.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => member.id && handleRemoveMember(member.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No family members added yet</p>
                <p className="text-sm">Click &quot;Add Member&quot; to add family members</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Notice */}
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Changes require approval
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  All profile changes are reviewed by an admin before being displayed on the attendee map. 
                  You&apos;ll be notified once your changes are approved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Member Dialog Component
function MemberDialog({ 
  member, 
  onSave, 
  saving 
}: { 
  member: FamilyMember | null
  onSave: (member: FamilyMember) => void
  saving: boolean
}) {
  const [formData, setFormData] = useState<FamilyMember>({
    first_name: "",
    last_name: "",
    member_type: "adult",
    age_group: "adult",
    gender: "",
    grade: "",
    special_needs: false,
    notes: ""
  })

  useEffect(() => {
    if (member) {
      setFormData(member)
    } else {
      setFormData({
        first_name: "",
        last_name: "",
        member_type: "adult",
        age_group: "adult",
        gender: "",
        grade: "",
        special_needs: false,
        notes: ""
      })
    }
  }, [member])

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{member ? "Edit Family Member" : "Add Family Member"}</DialogTitle>
        <DialogDescription>
          {member ? "Update member information" : "Add a new member to your family"}. 
          Changes will be submitted for admin approval.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="memberFirstName">First Name</Label>
            <Input
              id="memberFirstName"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="memberLastName">Last Name</Label>
            <Input
              id="memberLastName"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="memberType">Member Type</Label>
            <Select 
              value={formData.member_type} 
              onValueChange={(value) => setFormData({ ...formData, member_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adult">Adult</SelectItem>
                <SelectItem value="child">Child</SelectItem>
                <SelectItem value="teen">Teen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ageGroup">Age Group</Label>
            <Select 
              value={formData.age_group} 
              onValueChange={(value) => setFormData({ ...formData, age_group: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adult">Adult</SelectItem>
                <SelectItem value="13-17">Teen (13-17)</SelectItem>
                <SelectItem value="6-12">Child (6-12)</SelectItem>
                <SelectItem value="0-5">Young Child (0-5)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select 
              value={formData.gender} 
              onValueChange={(value) => setFormData({ ...formData, gender: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="grade">Grade (if applicable)</Label>
            <Input
              id="grade"
              placeholder="e.g. 5th"
              value={formData.grade || ""}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="specialNeeds"
            checked={formData.special_needs || false}
            onCheckedChange={(checked) => setFormData({ ...formData, special_needs: checked as boolean })}
          />
          <Label htmlFor="specialNeeds" className="text-sm font-normal">
            Special needs or accommodations required
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any additional information..."
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button 
          onClick={() => onSave({ ...formData, id: member?.id })}
          disabled={saving || !formData.first_name || !formData.last_name || !formData.gender}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Submit for Approval
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
