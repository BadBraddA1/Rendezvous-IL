"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ARRIVAL_OPTIONS,
  DEPARTURE_OPTIONS,
  STANDARD_ARRIVAL_SUMMARY,
  memberDisplayName,
} from "@/lib/registration-arrival-departure"
import type { ArrivalDeparturePlan, FamilyMember } from "@/types/registration"

type Props = {
  plan: ArrivalDeparturePlan
  familyMembers: FamilyMember[]
  familyLastName: string
  onChange: (plan: ArrivalDeparturePlan) => void
}

export function ArrivalDepartureSection({ plan, familyMembers, familyLastName, onChange }: Props) {
  const namedMembers = familyMembers.filter((m) => m.firstName.trim())

  const setNonStandard = (checked: boolean) => {
    if (!checked) {
      onChange({
        nonStandard: false,
        arrival: "",
        departure: "",
        memberIds: [],
        notes: "",
      })
      return
    }
    onChange({
      ...plan,
      nonStandard: true,
      memberIds:
        plan.memberIds.length > 0
          ? plan.memberIds
          : namedMembers.map((m) => m.id),
    })
  }

  const toggleMember = (memberId: string, checked: boolean) => {
    const next = checked
      ? [...new Set([...plan.memberIds, memberId])]
      : plan.memberIds.filter((id) => id !== memberId)
    onChange({ ...plan, memberIds: next })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Arrival &amp; Departure</h3>
        <p className="mt-1 text-sm text-muted-foreground">{STANDARD_ARRIVAL_SUMMARY}</p>
      </div>

      <div className="flex items-start space-x-3 rounded-lg border border-border/60 bg-surface-tint/40 p-4">
        <Checkbox
          id="non-standard-attendance"
          checked={plan.nonStandard}
          onCheckedChange={(checked) => setNonStandard(checked === true)}
          className="mt-0.5"
        />
        <div className="space-y-1">
          <Label htmlFor="non-standard-attendance" className="cursor-pointer font-medium leading-snug">
            Our family has non-standard arrival or departure times
          </Label>
          <p className="text-sm text-muted-foreground">
            Leave unchecked if everyone is arriving Monday before 5:15 PM and leaving Friday after lunch. Only check
            this if someone will miss part of the standard week.
          </p>
        </div>
      </div>

      {plan.nonStandard && (
        <div className="space-y-4 rounded-lg border border-primary/15 bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="planned-arrival">Planned arrival</Label>
              <Select
                value={plan.arrival || undefined}
                onValueChange={(value) => onChange({ ...plan, arrival: value })}
              >
                <SelectTrigger id="planned-arrival" className="w-full">
                  <SelectValue placeholder="Select arrival time" />
                </SelectTrigger>
                <SelectContent>
                  {ARRIVAL_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="planned-departure">Planned departure</Label>
              <Select
                value={plan.departure || undefined}
                onValueChange={(value) => onChange({ ...plan, departure: value })}
              >
                <SelectTrigger id="planned-departure" className="w-full">
                  <SelectValue placeholder="Select departure time" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTURE_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Who does this apply to?</Label>
            {namedMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add family members above, then select who has this schedule.
              </p>
            ) : (
              <div className="space-y-2 rounded-md border border-border/60 p-3">
                {namedMembers.map((member) => {
                  const label = memberDisplayName(member, familyLastName)
                  const inputId = `arrival-member-${member.id}`
                  return (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={inputId}
                        checked={plan.memberIds.includes(member.id)}
                        onCheckedChange={(checked) => toggleMember(member.id, checked === true)}
                      />
                      <Label htmlFor={inputId} className="cursor-pointer font-normal">
                        {label}
                      </Label>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="arrival-departure-notes">Additional notes (optional)</Label>
            <Textarea
              id="arrival-departure-notes"
              placeholder="e.g., Driving separately, meeting us Tuesday morning, etc."
              value={plan.notes}
              onChange={(e) => onChange({ ...plan, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  )
}
