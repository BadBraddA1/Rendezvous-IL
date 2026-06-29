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
  Home,
  Edit
} from "lucide-react"
import {
  ageAtEvent,
  ageGroupForMemberType,
  deriveMemberClassification,
  formatAgeGroupLabel,
  type ProfileMemberType,
} from "@/lib/member-age"
import {
  FamilyDirectoryPhotoCard,
  type FamilyDirectoryPhotoState,
} from "@/components/family/family-directory-photo-card"

interface FamilyMember {
  id?: number
  first_name: string
  last_name: string
  member_type: string
  age_group: string
  date_of_birth?: string | null
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
  address?: string
  city: string
  state: string
  zip: string
  home_congregation: string
  members: FamilyMember[]
  photo_url?: string | null
  directory_opt_in?: boolean
  directory_blurb?: string | null
  photo_updated_at?: string | null
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
  const [registrationBirthdays, setRegistrationBirthdays] = useState<
    { first_name: string; last_name: string; date_of_birth: string }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(true)
  const [editedFamily, setEditedFamily] = useState<Partial<Family>>({})
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [directorySettings, setDirectorySettings] = useState<FamilyDirectoryPhotoState>({
    photo_url: null,
    directory_opt_in: false,
    directory_blurb: null,
    photo_updated_at: null,
  })

  useEffect(() => {
    if (isLoaded && user) {
      fetchProfile()
    } else if (isLoaded && !user) {
      setLoading(false)
    }
  }, [isLoaded, user])

  async function fetchProfile() {
    try {
      const response = await fetch("/api/family/profile")
      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error || "Failed to load family profile")
        return
      }

      setFamily(data.family)
      setPendingChanges(data.pendingChanges || [])
      setRegistrationBirthdays(data.registrationBirthdays || [])
      if (data.family) {
        setEditedFamily(data.family)
        setDirectorySettings({
          photo_url: data.family.photo_url ?? null,
          directory_opt_in: Boolean(data.family.directory_opt_in),
          directory_blurb: data.family.directory_blurb ?? null,
          photo_updated_at: data.family.photo_updated_at ?? null,
        })
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      setErrorMessage("Failed to load family profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveProfile() {
    setSaving(true)
    setErrorMessage("")
    setSuccessMessage("")
    try {
      const response = await fetch("/api/family/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedFamily)
      })
      const data = await response.json()
      
      if (!response.ok) {
        setErrorMessage(data.error || "Failed to save profile changes")
        return
      }

      if (data.changesCount > 0) {
        setSuccessMessage(`${data.changesCount} change(s) submitted for admin approval`)
      } else {
        setSuccessMessage("No changes detected — your profile is already up to date")
      }
      fetchProfile()
      setTimeout(() => setSuccessMessage(""), 5000)
    } catch (error) {
      console.error("Error saving profile:", error)
      setErrorMessage("Failed to save profile changes. Please try again.")
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
      <div className="mx-auto max-w-2xl flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-subheading">Sign In Required</CardTitle>
              <CardDescription>Please sign in to view your family profile</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/sign-in?redirect_url=/account/profile">
                <Button className="w-full">Sign In</Button>
              </Link>
            </CardContent>
          </Card>
      </div>
    )
  }

  if (!family) {
    return (
      <div className="mx-auto max-w-2xl">
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
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/account">
            <Button variant="ghost" size="icon" aria-label="Back to account dashboard">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-section-title">Family Profile</h1>
            <p className="text-lead text-muted-foreground">Manage your family information</p>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="flex items-center gap-3 rounded-lg border border-success/35 bg-surface-highlight p-4">
            <CheckCircle className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <p className="font-medium text-success">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/35 bg-destructive/5 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <p className="font-medium text-destructive">{errorMessage}</p>
          </div>
        )}

        {/* Pending Changes Alert */}
        {pendingChanges.length > 0 && (
          <Card className="border border-warning/35 bg-surface-warm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-widget-heading text-warning">
                <Clock className="h-5 w-5" aria-hidden="true" />
                Pending Changes
              </CardTitle>
              <CardDescription className="text-on-surface">
                You have {pendingChanges.length} change(s) awaiting admin approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingChanges.map((change) => (
                  <div key={change.id} className="flex items-center gap-2 text-sm text-on-surface">
                    <Badge variant="outline" className="border-warning/35 text-warning">
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

        <FamilyDirectoryPhotoCard
          settings={directorySettings}
          onChange={setDirectorySettings}
        />

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
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={editedFamily.address || ""}
                    onChange={(e) => setEditedFamily({ ...editedFamily, address: e.target.value })}
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
                  registrationBirthdays={registrationBirthdays}
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
                          <Badge variant="secondary" className="text-xs capitalize">
                            {member.member_type}
                          </Badge>
                          {member.date_of_birth ? (
                            <span>
                              Age {ageAtEvent(member.date_of_birth)} at Rendezvous ·{" "}
                              {formatAgeGroupLabel(member.age_group)}
                            </span>
                          ) : (
                            <span>{formatAgeGroupLabel(member.age_group)}</span>
                          )}
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
                        aria-label={`Edit ${member.first_name} ${member.last_name}`}
                      >
                        <Edit className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            aria-label={`Remove ${member.first_name} ${member.last_name}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
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
        <Card className="border-primary/25 bg-surface-highlight">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Changes require approval
                </p>
                <p className="text-sm text-muted-foreground">
                  All profile changes are reviewed by an admin before being displayed on the attendee map. 
                  You&apos;ll be notified once your changes are approved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  )
}

// Member Dialog Component
function MemberDialog({ 
  member,
  registrationBirthdays,
  onSave, 
  saving 
}: { 
  member: FamilyMember | null
  registrationBirthdays: { first_name: string; last_name: string; date_of_birth: string }[]
  onSave: (member: FamilyMember) => void
  saving: boolean
}) {
  const emptyMember: FamilyMember = {
    first_name: "",
    last_name: "",
    member_type: "adult",
    age_group: "adult",
    gender: "",
    grade: "",
    special_needs: false,
    notes: "",
  }

  const [formData, setFormData] = useState<FamilyMember>(emptyMember)

  useEffect(() => {
    if (!member) {
      setFormData(emptyMember)
      return
    }

    const classified = deriveMemberClassification(member.date_of_birth)
    setFormData(
      classified
        ? {
            ...member,
            member_type: classified.member_type,
            age_group: classified.age_group,
          }
        : member,
    )
  }, [member])

  useEffect(() => {
    if (formData.date_of_birth || !formData.first_name || !formData.last_name) return

    const match = registrationBirthdays.find(
      (hint) =>
        hint.first_name.trim().toLowerCase() === formData.first_name.trim().toLowerCase() &&
        hint.last_name.trim().toLowerCase() === formData.last_name.trim().toLowerCase(),
    )

    if (!match) return

    const classified = deriveMemberClassification(match.date_of_birth)
    setFormData((prev) => ({
      ...prev,
      date_of_birth: match.date_of_birth,
      member_type: classified?.member_type ?? prev.member_type,
      age_group: classified?.age_group ?? prev.age_group,
    }))
  }, [
    formData.first_name,
    formData.last_name,
    formData.date_of_birth,
    registrationBirthdays,
  ])

  const classifiedFromBirthday = deriveMemberClassification(formData.date_of_birth)
  const hasBirthday = Boolean(formData.date_of_birth)
  const showAgeGroupPicker =
    !hasBirthday && formData.member_type === "child"
  const showGradeField =
    formData.member_type === "child" || formData.member_type === "teen"

  function handleMemberTypeChange(value: ProfileMemberType) {
    setFormData((prev) => ({
      ...prev,
      member_type: value,
      age_group: ageGroupForMemberType(value),
    }))
  }

  function buildPayload(): FamilyMember {
    if (classifiedFromBirthday) {
      return {
        ...formData,
        member_type: classifiedFromBirthday.member_type,
        age_group: classifiedFromBirthday.age_group,
      }
    }

    if (formData.member_type === "child") {
      return formData
    }

    return {
      ...formData,
      age_group: ageGroupForMemberType(formData.member_type as ProfileMemberType),
    }
  }

  function formatBirthday(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

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

        {hasBirthday && classifiedFromBirthday && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
            <p>
              <span className="font-medium">Birthday:</span>{" "}
              {formatBirthday(formData.date_of_birth!)}
            </p>
            <p>
              <span className="font-medium">At Rendezvous 2027:</span> age{" "}
              {classifiedFromBirthday.age} ·{" "}
              {formatAgeGroupLabel(classifiedFromBirthday.age_group)}
            </p>
            <p className="text-muted-foreground">
              Pulled from your registration — type and age group are set automatically.
            </p>
          </div>
        )}

        {!hasBirthday && (
          <div className="space-y-2">
            <Label htmlFor="memberType">Member Type</Label>
            <Select
              value={formData.member_type}
              onValueChange={(value) => handleMemberTypeChange(value as ProfileMemberType)}
            >
              <SelectTrigger id="memberType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adult">Adult</SelectItem>
                <SelectItem value="teen">Teen</SelectItem>
                <SelectItem value="child">Child</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {showAgeGroupPicker && (
          <div className="space-y-2">
            <Label htmlFor="ageGroup">Age Group</Label>
            <Select
              value={formData.age_group}
              onValueChange={(value) => setFormData({ ...formData, age_group: value })}
            >
              <SelectTrigger id="ageGroup">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6-12">Child (6–12)</SelectItem>
                <SelectItem value="0-5">Young child (0–5)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              No birthday on file yet — pick the closest group for now.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select 
              value={formData.gender} 
              onValueChange={(value) => setFormData({ ...formData, gender: value })}
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {showGradeField && (
            <div className="space-y-2">
              <Label htmlFor="grade">Grade (if applicable)</Label>
              <Input
                id="grade"
                placeholder="e.g. 5th"
                value={formData.grade || ""}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              />
            </div>
          )}
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
          onClick={() => onSave({ ...buildPayload(), id: member?.id })}
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
