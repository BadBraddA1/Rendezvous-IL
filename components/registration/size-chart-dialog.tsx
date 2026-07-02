"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Ruler } from "lucide-react"

/**
 * Native t-shirt size charts (data transcribed from the supplier PDF), scoped
 * to the sizes we actually offer on the registration form. Measurements in
 * inches unless noted.
 */

type ChartRow = string[]

type Chart = {
  title: string
  note?: string
  headers: string[]
  rows: ChartRow[]
}

const CHARTS: Chart[] = [
  {
    title: "Adult (Unisex)",
    headers: ["Size", "Chest", "Waist"],
    rows: [
      ["S", "35–37", "29–31"],
      ["M", "38–40", "32–34"],
      ["L", "41–43", "35–37"],
      ["XL", "44–46", "38–40"],
      ["2XL", "47–49", "41–43"],
      ["3XL", "50–53", "44–47"],
      ["4XL", "54–57", "48–51"],
      ["5XL", "58–60", "52–54"],
    ],
  },
  {
    title: "Women's",
    headers: ["Size", "Dress size", "Bust", "Waist", "Hip"],
    rows: [
      ["S", "4/6", "35–37", "27–28", "37–38"],
      ["M", "8/10", "37–38", "29–30", "39–40"],
      ["L", "12/14", "39–41", "31–33", "41–43"],
      ["XL", "16/18", "42–44", "34–36", "44–46"],
      ["2XL", "20/22", "45–47", "37–39", "47–49"],
      ["3XL", "24/26", "48–51", "40–43", "50–53"],
    ],
  },
  {
    title: "Youth",
    headers: ["Size", "Kids' size", "Chest", "Waist"],
    rows: [
      ["XS", "4", "25–26", "24–25"],
      ["S", "6/8", "26–28", "26–27"],
      ["M", "10/12", "28–30", "26–27"],
      ["L", "14/16", "30–32", "27–28"],
    ],
  },
  {
    title: "Toddler",
    headers: ["Size", "Age", "Height (in)", "Weight (lbs)"],
    rows: [
      ["2T", "1–2 yrs", "33–35", "28–30"],
      ["4T", "3–4 yrs", "39–41", "34–39"],
      ["5/6", "5–6 yrs", "42–45", "39–49"],
    ],
  },
  {
    title: "Infant",
    headers: ["Size", "Age", "Height (in)", "Weight (lbs)"],
    rows: [
      ["6M", "3–6 months", "22–24", "10–16"],
      ["12M", "6–12 months", "25–28", "17–20"],
      ["18M", "12–18 months", "29–31", "21–24"],
      ["24M", "18–24 months", "32–34", "25–27"],
    ],
  },
]

function SizeChartTable({ chart }: { chart: Chart }) {
  return (
    <div>
      <h3 className="mb-2 font-semibold">{chart.title}</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {chart.headers.map((header) => (
                <th key={header} className="px-3 py-2 text-left font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row) => (
              <tr key={row[0]} className="border-b last:border-b-0">
                {row.map((cell, index) => (
                  <td
                    key={index}
                    className={
                      index === 0 ? "px-3 py-2 font-medium" : "px-3 py-2 text-muted-foreground"
                    }
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {chart.note && <p className="mt-1 text-xs text-muted-foreground">{chart.note}</p>}
    </div>
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SizeChartDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Ruler className="h-4 w-4" aria-hidden="true" />
          Size Chart
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>T-Shirt Size Charts</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Body measurements in inches unless noted. If you&apos;re between sizes, order the larger
          one.
        </p>
        <div className="space-y-6">
          {CHARTS.map((chart) => (
            <SizeChartTable key={chart.title} chart={chart} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
