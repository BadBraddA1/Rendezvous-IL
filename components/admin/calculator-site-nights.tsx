"use client"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CalculatorSiteNightsProps = {
  value: number
  max: number
  onChange: (nights: number) => void
}

export function CalculatorSiteNights({ value, max, onChange }: CalculatorSiteNightsProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Site nights (one tap)</Label>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <Button
            key={n}
            type="button"
            variant={value === n ? "default" : "outline"}
            className={cn("min-h-11 min-w-[3rem]", value === n && "shadow-sm")}
            onClick={() => onChange(n)}
            aria-pressed={value === n}
          >
            {n}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {max} nights max (Monday–Thursday). Fee is per site, not per person.
      </p>
    </div>
  )
}
