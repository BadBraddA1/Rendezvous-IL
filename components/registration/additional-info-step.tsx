"use client"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, AlertCircle } from "lucide-react"
import type { RegistrationData, HealthInfo } from "@/types/registration"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Props = {
  data: RegistrationData
  updateData: (updates: Partial<RegistrationData>) => void
}

const VOLUNTEER_TYPES = ["Leading singing", "Leading prayer", "Reading scripture", "Presenting a lesson"]

export function AdditionalInfoStep({ data, updateData }: Props) {
  const addHealthInfo = () => {
    const newInfo: HealthInfo = {
      id: Date.now().toString(),
      fullName: "",
      condition: "",
      medicationOnHand: false,
    }
    updateData({ healthInfo: [...data.healthInfo, newInfo] })
  }

  const removeHealthInfo = (id: string) => {
    updateData({ healthInfo: data.healthInfo.filter((h) => h.id !== id) })
  }

  const updateHealthInfo = (id: string, updates: Partial<HealthInfo>) => {
    updateData({
      healthInfo: data.healthInfo.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    })
  }

  const toggleVolunteer = (type: string) => {
    const existing = data.volunteerSignups.find((v) => v.type === type)
    if (existing) {
      updateData({
        volunteerSignups: data.volunteerSignups.filter((v) => v.type !== type),
      })
    } else {
      updateData({
        volunteerSignups: [...data.volunteerSignups, { type, names: [] }],
      })
    }
  }

  const addVolunteerToType = (type: string, name: string) => {
    updateData({
      volunteerSignups: data.volunteerSignups.map((v) => (v.type === type ? { ...v, names: [...v.names, name] } : v)),
    })
  }

  const removeVolunteerFromType = (type: string, name: string) => {
    updateData({
      volunteerSignups: data.volunteerSignups.map((v) =>
        v.type === type ? { ...v, names: v.names.filter((n) => n !== name) } : v,
      ),
    })
  }

  const getEligibleVolunteers = () => {
    return data.familyMembers.filter((member) => {
      if (member.firstName.trim() === "") return false
      // Males (children) or Father (adults) can volunteer, must be baptized
      const isMaleOrFather = member.gender === "male" || member.parentRole === "father"
      return isMaleOrFather && member.isBaptized
    })
  }

  const eligibleVolunteers = getEligibleVolunteers()

  return (
    <div className="space-y-6">
      {/* Emergency Contact */}
      <div className="space-y-4">
        <h3 className="font-semibold">Emergency Contact</h3>
        <p className="text-sm text-muted-foreground">Someone who will NOT be attending Rendezvous</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="emergencyContactName">Name *</Label>
            <Input
              id="emergencyContactName"
              value={data.emergencyContactName}
              onChange={(e) => updateData({ emergencyContactName: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="emergencyContactRelationship">Relationship *</Label>
            <Input
              id="emergencyContactRelationship"
              placeholder="e.g., Brother, Friend"
              value={data.emergencyContactRelationship}
              onChange={(e) => updateData({ emergencyContactRelationship: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="emergencyContactPhone">Phone Number *</Label>
            <Input
              id="emergencyContactPhone"
              type="tel"
              placeholder="(555) 555-5555"
              value={data.emergencyContactPhone}
              onChange={(e) => updateData({ emergencyContactPhone: e.target.value })}
              required
            />
          </div>
        </div>
      </div>

      {/* Health Information */}
      <div className="space-y-4">
        <h3 className="font-semibold">Allergies & Health Conditions</h3>
        <p className="text-sm text-muted-foreground">
          Food allergies, medical conditions, or other health information we should know about
        </p>

        {data.healthInfo.length > 0 && (
          <div className="space-y-3">
            {data.healthInfo.map((info) => (
              <div key={info.id} className="flex items-start gap-3 rounded-lg border p-4">
                <div className="flex-1 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label htmlFor={`health-name-${info.id}`}>Family Member</Label>
                      <Select
                        value={info.fullName}
                        onValueChange={(value) => updateHealthInfo(info.id, { fullName: value })}
                      >
                        <SelectTrigger id={`health-name-${info.id}`}>
                          <SelectValue placeholder="Select family member" />
                        </SelectTrigger>
                        <SelectContent>
                          {data.familyMembers
                            .filter((member) => member.firstName.trim() !== "")
                            .map((member) => (
                              <SelectItem key={member.id} value={`${member.firstName} ${data.familyLastName}`}>
                                {member.firstName} {data.familyLastName}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`health-condition-${info.id}`}>Condition/Allergy</Label>
                      <Input
                        id={`health-condition-${info.id}`}
                        placeholder="e.g., Peanut allergy, Asthma"
                        value={info.condition}
                        onChange={(e) => updateHealthInfo(info.id, { condition: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`medication-${info.id}`}
                      checked={info.medicationOnHand}
                      onCheckedChange={(checked) => updateHealthInfo(info.id, { medicationOnHand: checked as boolean })}
                    />
                    <Label htmlFor={`medication-${info.id}`} className="cursor-pointer">
                      Medication on hand
                    </Label>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeHealthInfo(info.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button onClick={addHealthInfo} variant="outline" className="w-full bg-transparent">
          <Plus className="mr-2 h-4 w-4" />
          Add Health Information
        </Button>
      </div>

      {/* Volunteer Signups */}
      <div className="space-y-4">
        <h3 className="font-semibold">Volunteer for Worship Services</h3>
        <p className="text-sm text-muted-foreground">
          Christian men (young & old) are encouraged to help lead our morning and evening assemblies
        </p>

        {eligibleVolunteers.length === 0 && (
          <Alert className="border-muted bg-muted/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Only baptized males and fathers can volunteer for worship services. Please add eligible family members in
              the Family Info step.
            </AlertDescription>
          </Alert>
        )}

        {eligibleVolunteers.length > 0 && (
          <div className="space-y-3">
            {VOLUNTEER_TYPES.map((type) => {
              const volunteer = data.volunteerSignups.find((v) => v.type === type)
              const isChecked = !!volunteer

              return (
                <div key={type} className="rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`volunteer-${type}`}
                      checked={isChecked}
                      onCheckedChange={() => toggleVolunteer(type)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`volunteer-${type}`} className="cursor-pointer font-medium">
                        {type}
                      </Label>
                      {isChecked && (
                        <div className="mt-2 space-y-2">
                          {volunteer?.names.map((name, index) => (
                            <div key={index} className="flex items-center gap-2 rounded border bg-muted p-2">
                              <span className="flex-1 text-sm">
                                {name}{" "}
                                {eligibleVolunteers.find((m) => m.firstName === name)?.parentRole === "father"
                                  ? "(Father)"
                                  : "(Male)"}
                              </span>
                              <Button variant="ghost" size="sm" onClick={() => removeVolunteerFromType(type, name)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <Select
                            value=""
                            onValueChange={(value) => {
                              if (value && !volunteer?.names.includes(value)) {
                                addVolunteerToType(type, value)
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Add volunteer from family" />
                            </SelectTrigger>
                            <SelectContent>
                              {eligibleVolunteers
                                .filter((member) => !volunteer?.names.includes(member.firstName))
                                .map((member) => (
                                  <SelectItem key={member.id} value={member.firstName}>
                                    {member.firstName} {member.parentRole === "father" ? "(Father)" : "(Male)"}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Session Suggestions */}
      <div className="space-y-4">
        <h3 className="font-semibold">Session Topic Suggestions</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="momsSuggestion">Mom's Session (Tuesday 10 AM)</Label>
            <Textarea
              id="momsSuggestion"
              placeholder="Optional: Suggest a topic for the mom's session"
              value={data.sessionSuggestions.moms}
              onChange={(e) =>
                updateData({
                  sessionSuggestions: { ...data.sessionSuggestions, moms: e.target.value },
                })
              }
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="dadsSuggestion">Dad's Session (Wednesday 10 AM)</Label>
            <Textarea
              id="dadsSuggestion"
              placeholder="Optional: Suggest a topic for the dad's session"
              value={data.sessionSuggestions.dads}
              onChange={(e) =>
                updateData({
                  sessionSuggestions: { ...data.sessionSuggestions, dads: e.target.value },
                })
              }
              rows={2}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
