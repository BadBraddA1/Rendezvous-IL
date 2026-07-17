"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrivalDepartureSection } from "@/components/registration/arrival-departure-section"
import { CustomDateSelector } from "@/components/registration/custom-date-selector"
import { Plus, Trash2, Star } from "lucide-react"
import type { RegistrationData, FamilyMember } from "@/types/registration"
import { formatPhoneNumber } from "@/lib/phone-format"

function formatPhoneOnBlur(value: string) {
  return formatPhoneNumber(value) || value
}

type Props = {
  data: RegistrationData
  updateData: (updates: Partial<RegistrationData>) => void
}

export function FamilyInfoStep({ data, updateData }: Props) {
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<FamilyMember | null>(null)

  const addFamilyMember = () => {
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      firstName: "",
      lastName: "",
      useCustomLastName: false,
      dateOfBirth: "",
      age: 0,
      isBaptized: false,
      personCost: 0,
      isOver18: false,
      gender: null,
      parentRole: null,
    }
    updateData({ familyMembers: [...data.familyMembers, newMember] })
  }

  const removeFamilyMember = (id: string) => {
    const memberToRemove = data.familyMembers.find((m) => m.id === id)
    if (!memberToRemove || data.familyMembers.length <= 1) {
      return
    }

    if (memberToRemove.firstName.trim() !== "" || memberToRemove.dateOfBirth) {
      setMemberPendingRemoval(memberToRemove)
      return
    }

    updateData({ familyMembers: data.familyMembers.filter((m) => m.id !== id) })
  }

  const confirmRemoveFamilyMember = () => {
    if (!memberPendingRemoval || data.familyMembers.length <= 1) {
      setMemberPendingRemoval(null)
      return
    }

    updateData({
      familyMembers: data.familyMembers.filter((m) => m.id !== memberPendingRemoval.id),
    })
    setMemberPendingRemoval(null)
  }

  const updateFamilyMember = (id: string, updates: Partial<FamilyMember>) => {
    if (updates.parentRole !== undefined) {
      if (updates.parentRole === "father") {
        updates.gender = "male"
      } else if (updates.parentRole === "mother") {
        updates.gender = "female"
      }
    }
    updateData({
      familyMembers: data.familyMembers.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })
  }

  const calculateAge = (dob: string) => {
    if (!dob) return 0
    const birthDate = new Date(dob)
    const eventDate = new Date("2027-05-03")
    let age = eventDate.getFullYear() - birthDate.getFullYear()
    const monthDiff = eventDate.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && eventDate.getDate() < birthDate.getDate())) {
      age--
    }
    return Math.max(0, age)
  }

  const isParentRoleTaken = (role: "father" | "mother", currentMemberId: string) => {
    return data.familyMembers.some((m) => m.id !== currentMemberId && m.parentRole === role)
  }

  const hasDuplicateParentEmail = (member: FamilyMember) => {
    if (!member.parentRole || !member.email?.trim()) return false
    const email = member.email.trim().toLowerCase()
    return data.familyMembers.some(
      (m) =>
        m.id !== member.id && m.parentRole && m.email?.trim().toLowerCase() === email,
    )
  }

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="font-semibold">Contact Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="familyLastName">Family Last Name *</Label>
            <Input
              id="familyLastName"
              value={data.familyLastName}
              onChange={(e) => updateData({ familyLastName: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email (Primary) *</Label>
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => updateData({ email: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="husbandPhone">Husband Phone</Label>
            <Input
              id="husbandPhone"
              type="tel"
              placeholder="(555) 555-5555"
              value={data.husbandPhone}
              onChange={(e) => updateData({ husbandPhone: e.target.value })}
              onBlur={(e) => {
                const formatted = formatPhoneOnBlur(e.target.value)
                if (formatted !== data.husbandPhone) updateData({ husbandPhone: formatted })
              }}
            />
          </div>
          <div>
            <Label htmlFor="wifePhone">Wife Phone</Label>
            <Input
              id="wifePhone"
              type="tel"
              placeholder="(555) 555-5555"
              value={data.wifePhone}
              onChange={(e) => updateData({ wifePhone: e.target.value })}
              onBlur={(e) => {
                const formatted = formatPhoneOnBlur(e.target.value)
                if (formatted !== data.wifePhone) updateData({ wifePhone: formatted })
              }}
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="font-semibold">Address</h3>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="address">Street Address *</Label>
            <Input
              id="address"
              name="street-address"
              autoComplete="street-address"
              value={data.address}
              onChange={(e) => updateData({ address: e.target.value })}
              placeholder="123 Main Street"
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                name="city"
                autoComplete="address-level2"
                value={data.city}
                onChange={(e) => updateData({ city: e.target.value })}
                placeholder="Springfield"
                required
              />
            </div>
            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                name="state"
                autoComplete="address-level1"
                maxLength={2}
                placeholder="IL"
                value={data.state}
                onChange={(e) => updateData({ state: e.target.value.toUpperCase() })}
                required
              />
            </div>
          </div>
          <div className="md:w-1/3">
            <Label htmlFor="zip">ZIP Code *</Label>
            <Input
              id="zip"
              name="postal-code"
              autoComplete="postal-code"
              maxLength={5}
              value={data.zip}
              onChange={(e) => updateData({ zip: e.target.value })}
              placeholder="62702"
              required
            />
          </div>
        </div>
      </div>

      {/* Additional Family Info */}
      <div className="space-y-4">
        <h3 className="font-semibold">Family Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="homeCongregation">Home Congregation *</Label>
            <Input
              id="homeCongregation"
              value={data.homeCongregation}
              onChange={(e) => updateData({ homeCongregation: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="fatherOccupation">Father's Occupation</Label>
            <Input
              id="fatherOccupation"
              value={data.fatherOccupation}
              onChange={(e) => updateData({ fatherOccupation: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="timesAttended"> Number of Prior Years at Rendezvous?</Label>
            <Input
              id="timesAttended"
              type="number"
              min="0"
              value={data.timesAttended}
              onChange={(e) => updateData({ timesAttended: Number.parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="yearsHomeschooling">Number of Years Homeschooling</Label>
            <Input
              id="yearsHomeschooling"
              type="number"
              min="0"
              value={data.yearsHomeschooling}
              onChange={(e) => updateData({ yearsHomeschooling: Number.parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="currentlyHomeschooling"
            checked={data.currentlyHomeschooling}
            onCheckedChange={(checked) => updateData({ currentlyHomeschooling: checked as boolean })}
          />
          <Label htmlFor="currentlyHomeschooling" className="cursor-pointer">
            Currently Homeschooling?
          </Label>
        </div>
      </div>

      {/* Family Members */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Family Members Attending</h3>
          <span className="text-sm text-muted-foreground">{""}</span>
        </div>
        <p className="text-sm text-muted-foreground">Write names as they should appear on name badges.</p>
        <div className="space-y-3">
          {data.familyMembers.map((member, index) => (
            <div key={member.id} className="flex items-start gap-3 rounded-lg border p-4">
              <div className="flex-1 space-y-3">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`firstName-${member.id}`}>First Name *</Label>
                    <Input
                      id={`firstName-${member.id}`}
                      value={member.firstName}
                      onChange={(e) => updateFamilyMember(member.id, { firstName: e.target.value })}
                      placeholder="e.g., John"
                      required
                    />
                  </div>

                  <CustomDateSelector
                    id={`dob-${member.id}`}
                    label="Date of Birth for Anyone Under 18 Years Old *"
                    value={member.dateOfBirth}
                    onChange={(date) => {
                      const age = calculateAge(date)
                      updateFamilyMember(member.id, { dateOfBirth: date, age, isOver18: false })
                    }}
                    isOver18={member.isOver18 || false}
                    onOver18Change={(isOver18) => {
                      updateFamilyMember(member.id, { isOver18, age: 18, dateOfBirth: "" })
                    }}
                    required
                  />

                  {member.age >= 0 && !member.isOver18 && member.dateOfBirth && (
                    <p className="text-sm text-muted-foreground">
                      Age on May 3, 2027: {member.age} {member.age === 1 ? "year" : "years"} old
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`useCustomLastName-${member.id}`}
                      checked={member.useCustomLastName || false}
                      onCheckedChange={(checked) => {
                        updateFamilyMember(member.id, {
                          useCustomLastName: checked as boolean,
                          lastName: checked ? member.lastName : "",
                        })
                      }}
                    />
                    <Label htmlFor={`useCustomLastName-${member.id}`} className="cursor-pointer text-sm">
                      Different last name than {data.familyLastName || "family"}
                    </Label>
                  </div>
                  {member.useCustomLastName && (
                    <div>
                      <Label htmlFor={`lastName-${member.id}`}>Last Name *</Label>
                      <Input
                        id={`lastName-${member.id}`}
                        value={member.lastName || ""}
                        onChange={(e) => updateFamilyMember(member.id, { lastName: e.target.value })}
                        placeholder="Enter last name"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {member.isOver18 || member.age >= 18 ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`parentRole-${member.id}`} className="text-sm">
                          Role:
                        </Label>
                        <Select
                          value={member.parentRole || "none"}
                          onValueChange={(value) => {
                            updateFamilyMember(member.id, {
                              parentRole: value === "none" ? null : (value as "father" | "mother"),
                            })
                          }}
                        >
                          <SelectTrigger id={`parentRole-${member.id}`} className="w-32">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select</SelectItem>
                            <SelectItem value="father" disabled={isParentRoleTaken("father", member.id)}>
                              Father {isParentRoleTaken("father", member.id) && "(taken)"}
                            </SelectItem>
                            <SelectItem value="mother" disabled={isParentRoleTaken("mother", member.id)}>
                              Mother {isParentRoleTaken("mother", member.id) && "(taken)"}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`gender-${member.id}`} className="text-sm">
                          Gender:
                        </Label>
                        <Select
                          value={member.gender || "none"}
                          onValueChange={(value) => {
                            updateFamilyMember(member.id, {
                              gender: value === "none" ? null : (value as "male" | "female"),
                            })
                          }}
                          disabled={!!member.parentRole}
                        >
                          <SelectTrigger id={`gender-${member.id}`} className="w-32">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`gender-${member.id}`} className="text-sm">
                        Gender:
                      </Label>
                      <Select
                        value={member.gender || "none"}
                        onValueChange={(value) => {
                          updateFamilyMember(member.id, {
                            gender: value === "none" ? null : (value as "male" | "female"),
                          })
                        }}
                      >
                        <SelectTrigger id={`gender-${member.id}`} className="w-32">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`baptized-${member.id}`}
                      checked={member.isBaptized}
                      onCheckedChange={(checked) => updateFamilyMember(member.id, { isBaptized: checked as boolean })}
                    />
                    <Label htmlFor={`baptized-${member.id}`} className="flex cursor-pointer items-center gap-1">
                      <Star className="h-3 w-3" />
                      Baptized?
                    </Label>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label htmlFor={`memberEmail-${member.id}`}>
                      Email {member.parentRole ? "*" : "(optional)"}
                    </Label>
                    <Input
                      id={`memberEmail-${member.id}`}
                      type="email"
                      placeholder="name@example.com"
                      value={member.email || ""}
                      onChange={(e) => updateFamilyMember(member.id, { email: e.target.value })}
                      required={!!member.parentRole}
                      aria-invalid={hasDuplicateParentEmail(member)}
                    />
                    {hasDuplicateParentEmail(member) && (
                      <p className="mt-1 text-sm text-destructive">
                        Father and mother must use different email addresses.
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Used for signatures and app access — if they sign in with this email, they join
                      your family account (shared directory profile and year chats).
                    </p>
                  </div>
                  <div>
                    <Label htmlFor={`memberPhone-${member.id}`}>Phone (optional)</Label>
                    <Input
                      id={`memberPhone-${member.id}`}
                      type="tel"
                      placeholder="(555) 555-5555"
                      value={member.phone || ""}
                      onChange={(e) => updateFamilyMember(member.id, { phone: e.target.value })}
                      onBlur={(e) => {
                        const formatted = formatPhoneOnBlur(e.target.value)
                        if (formatted !== member.phone) updateFamilyMember(member.id, { phone: formatted })
                      }}
                    />
                  </div>
                </div>

                {(member.email?.trim() || member.phone?.trim()) && (
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id={`shareContact-${member.id}`}
                      checked={member.shareContactInDirectory ?? false}
                      onCheckedChange={(checked) =>
                        updateFamilyMember(member.id, { shareContactInDirectory: checked as boolean })
                      }
                    />
                    <Label
                      htmlFor={`shareContact-${member.id}`}
                      className="cursor-pointer text-sm font-normal leading-snug"
                    >
                      Show this email/phone in the Family Directory
                      <span className="block text-xs text-muted-foreground">
                        Names and ages are always listed — contact info only shows if you check
                        this box.
                      </span>
                    </Label>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFamilyMember(member.id)}
                disabled={data.familyMembers.length === 1}
                aria-label={`Remove ${member.firstName || "family member"}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
        <Button onClick={addFamilyMember} variant="outline" className="w-full bg-transparent">
          <Plus className="mr-2 h-4 w-4" />
          Add Family Member
        </Button>
      </div>

      <ArrivalDepartureSection
        plan={data.arrivalDeparture}
        familyMembers={data.familyMembers}
        familyLastName={data.familyLastName}
        onChange={(arrivalDeparture) => updateData({ arrivalDeparture })}
      />

      <AlertDialog
        open={memberPendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMemberPendingRemoval(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove family member?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberPendingRemoval
                ? `Remove ${memberPendingRemoval.firstName || "this family member"} from your registration? This cannot be undone.`
                : "Remove this family member from your registration? This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep this member</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveFamilyMember}>Remove member</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
