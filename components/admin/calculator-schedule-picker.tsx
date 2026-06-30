"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  DAY_MEALS,
  LODGING_NIGHTS,
  MEAL_LABELS,
  MEAL_LABELS_LONG,
  NIGHT_LABELS,
  PACKAGE_PRESETS,
  SCHEDULE_DAYS,
  type MemberAttendance,
  type PackagePreset,
  attendanceFromPreset,
  countMeals,
  detectPreset,
  toggleLodgingNight,
  toggleMeal,
} from "@/lib/calculator-schedule"

type CalculatorSchedulePickerProps = {
  attendance: MemberAttendance
  onChange: (next: MemberAttendance) => void
  compact?: boolean
  /** Drive-in: meals only, no lodging nights */
  driveIn?: boolean
}

export function CalculatorSchedulePicker({
  attendance,
  onChange,
  compact = false,
  driveIn = false,
}: CalculatorSchedulePickerProps) {
  const [showMeals, setShowMeals] = useState(driveIn)
  const preset = detectPreset(attendance)
  const mealCount = countMeals(attendance.meals)

  const applyPreset = (value: PackagePreset) => {
    if (value === "custom") {
      setShowMeals(true)
      return
    }
    onChange(attendanceFromPreset(value, attendance))
    setShowMeals(false)
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
      {!driveIn && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5 flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Schedule package</Label>
              <Select value={preset} onValueChange={(v) => applyPreset(v as PackagePreset)}>
                <SelectTrigger className="h-11 w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGE_PRESETS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label} — {option.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="secondary" className="w-fit shrink-0 tabular-nums">
              {attendance.nights.length} nights · {mealCount} meals
            </Badge>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Lodging nights (tap to toggle)</Label>
            <div className="flex flex-wrap gap-2">
              {LODGING_NIGHTS.map((night) => {
                const active = attendance.nights.includes(night)
                return (
                  <Button
                    key={night}
                    type="button"
                    variant={active ? "default" : "outline"}
                    size="sm"
                    className={cn("min-h-11 min-w-[3.25rem] px-3", active && "shadow-sm")}
                    onClick={() => onChange(toggleLodgingNight(attendance, night))}
                    aria-pressed={active}
                  >
                    {NIGHT_LABELS[night]}
                  </Button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {driveIn && (
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-medium">Meals to add</Label>
          <Badge variant="secondary" className="tabular-nums">
            {mealCount} meals selected
          </Badge>
        </div>
      )}

      {!driveIn && !compact && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-xs"
            onClick={() => setShowMeals((open) => !open)}
          >
            {showMeals ? "Hide meal details" : "Customize individual meals"}
          </Button>
          {preset !== "custom" && (
            <span className="text-xs text-muted-foreground self-center">
              Meals auto-match the package — expand only to fine-tune.
            </span>
          )}
        </div>
      )}

      {(showMeals || driveIn) && (
        <div className="overflow-x-auto scroll-touch-x pt-1">
          <table className="w-full min-w-[28rem] border-collapse text-xs">
            <thead>
              <tr>
                <th className="p-1 text-left font-medium text-muted-foreground">Day</th>
                {["breakfast", "lunch", "dinner"].map((meal) => (
                  <th key={meal} className="p-1 text-center font-medium text-muted-foreground">
                    {MEAL_LABELS_LONG[meal]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCHEDULE_DAYS.map((day) => {
                const available = DAY_MEALS[day] ?? []
                return (
                  <tr key={day} className="border-t border-border/50">
                    <td className="p-1 font-medium capitalize">{day}</td>
                    {(["breakfast", "lunch", "dinner"] as const).map((meal) => {
                      const offered = available.includes(meal)
                      const selected = attendance.meals[day]?.includes(meal)
                      return (
                        <td key={meal} className="p-1 text-center">
                          {offered ? (
                            <Button
                              type="button"
                              variant={selected ? "default" : "outline"}
                              size="sm"
                              className="h-9 w-full min-w-[2.75rem] px-1"
                              onClick={() => onChange(toggleMeal(attendance, day, meal))}
                              aria-pressed={selected}
                              aria-label={`${day} ${MEAL_LABELS_LONG[meal]}`}
                            >
                              {MEAL_LABELS[meal]}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
