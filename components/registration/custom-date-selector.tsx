"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  value: string
  onChange: (date: string) => void
  isOver18: boolean
  onOver18Change: (isOver18: boolean) => void
  id: string
  label?: string
  required?: boolean
}

export function CustomDateSelector({ value, onChange, isOver18, onOver18Change, id, label, required }: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<"year" | "month" | "day">("year")
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const generateYears = () => {
    const currentYear = new Date().getFullYear()
    const years: number[] = []
    for (let year = currentYear; year >= currentYear - 18; year--) {
      years.push(year)
    }
    return years
  }

  const handleYearSelect = (year: number) => {
    setSelectedYear(year)
    setView("month")
  }

  const handleMonthSelect = (month: number) => {
    setSelectedMonth(month)
    setView("day")
  }

  const handleDaySelect = (day: number) => {
    if (selectedMonth === null || selectedYear === null) return
    // Format: YYYY-MM-DD (pad month and day with leading zeros)
    const month = String(selectedMonth + 1).padStart(2, "0")
    const dayStr = String(day).padStart(2, "0")
    const dateString = `${selectedYear}-${month}-${dayStr}`
    onChange(dateString)
    setOpen(false)
    // Reset for next time
    setView("year")
    setSelectedYear(null)
    setSelectedMonth(null)
  }

  const getDaysInMonth = () => {
    if (selectedMonth === null || selectedYear === null) return []
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay()

    const days: (number | null)[] = []
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  const handleOver18 = () => {
    onOver18Change(true)
    setOpen(false)
    setView("year")
    setSelectedYear(null)
    setSelectedMonth(null)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen) {
      setView("year")
      setSelectedYear(null)
      setSelectedMonth(null)
    }
  }

  const formatDisplayValue = () => {
    if (isOver18) return "Adult (18+)"
    if (value) {
      const [year, month, day] = value.split("-").map(Number)
      return `${months[month - 1]} ${day}, ${year}`
    }
    return "Select date of birth"
  }

  const clearAdultAndOpen = () => {
    onOver18Change(false)
    setView("year")
    setSelectedYear(null)
    setSelectedMonth(null)
    setOpen(true)
  }

  // Adults are locked once chosen — no birth-year tweaking needed for pricing.
  if (isOver18) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>
          {label ?? "Date of Birth"}
          {required && !label?.includes("*") ? " *" : ""}
        </Label>
        <div className="flex min-w-0 items-center gap-2">
          <Button
            id={id}
            type="button"
            variant="outline"
            className="min-w-0 flex-1 justify-start overflow-hidden text-left font-normal"
            disabled
            aria-disabled="true"
          >
            <Calendar className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">{formatDisplayValue()}</span>
          </Button>
          <Button type="button" variant="ghost" size="sm" className="shrink-0 px-2" onClick={clearAdultAndOpen}>
            Change
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label ?? "Date of Birth"}
        {required && !label?.includes("*") ? " *" : ""}
      </Label>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {formatDisplayValue()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="space-y-4 p-4">
            {view === "year" && (
              <div className="space-y-2">
                <div className="text-sm font-medium mb-2">Select Birth Year</div>
                <div className="grid grid-cols-3 gap-2">
                  {generateYears().map((year) => (
                    <Button
                      key={year}
                      variant="outline"
                      className="h-12 bg-transparent"
                      onClick={() => handleYearSelect(year)}
                    >
                      {year}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {view === "month" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <Button variant="ghost" size="sm" onClick={() => setView("year")} className="text-sm font-medium">
                    ← {selectedYear}
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {months.map((month, index) => (
                    <Button
                      key={month}
                      variant="outline"
                      className="h-12 bg-transparent"
                      onClick={() => handleMonthSelect(index)}
                    >
                      {month}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {view === "day" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <Button variant="ghost" size="sm" onClick={() => setView("month")} className="text-sm font-medium">
                    ← {selectedYear} {selectedMonth !== null && months[selectedMonth]}
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {daysOfWeek.map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth().map((day, index) => (
                    <Button
                      key={index}
                      variant={
                        day &&
                        value &&
                        new Date(value).getDate() === day &&
                        new Date(value).getMonth() === selectedMonth &&
                        new Date(value).getFullYear() === selectedYear
                          ? "default"
                          : day
                            ? "outline"
                            : "ghost"
                      }
                      size="sm"
                      className={cn("min-h-11 h-11 p-0", !day && "invisible")}
                      disabled={!day}
                      onClick={() => day && handleDaySelect(day)}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Over 18 option */}
            <div className="pt-2 border-t">
              <Button variant="outline" className="w-full bg-transparent" onClick={handleOver18}>
                I Am 18+ / I Will Be 18 as of May 3, 2027 (Adult)
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
