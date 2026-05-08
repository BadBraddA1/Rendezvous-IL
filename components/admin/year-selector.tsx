"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "lucide-react"

interface YearSelectorProps {
  years: number[]
  selectedYear: number
}

export function YearSelector({ years, selectedYear }: YearSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleYearChange = (year: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("year", year)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Select year" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              Rendezvous {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
