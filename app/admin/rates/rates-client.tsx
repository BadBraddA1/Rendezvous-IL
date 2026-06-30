"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  DollarSign, 
  Plus, 
  Save, 
  Loader2, 
  CheckCircle,
  Home,
  Tent,
  Users,
  Star,
  Calendar,
  Clock
} from "lucide-react"
import { calculatorCategoryLabel, ratePricingHint } from "@/lib/rate-display"
import { invalidateCalculatorRates } from "@/lib/calculator-rates-swr"

interface Rate {
  id: number
  rate_chart_id: number
  category: string
  name: string
  label: string
  amount: string
  description: string | null
  sort_order: number
}

interface RateChart {
  id: number
  year: number
  is_active: boolean
  early_reg_deadline: string | null
  rates: Rate[]
}

const categoryIcons: Record<string, typeof DollarSign> = {
  registration: Calendar,
  motel: Home,
  rv: Home,
  tent: Tent,
  drivein: Home,
  deduction: DollarSign,
  meal_addition: DollarSign,
  special_3_9: Star,
  special_2_6: Star,
  special_1_3: Star,
  lodging: Users,
  site_fee: Home,
  extra: Star,
  other: DollarSign,
}

export function RatesClient() {
  const [rateCharts, setRateCharts] = useState<RateChart[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [editedRates, setEditedRates] = useState<Record<number, string>>({})
  const [newYearDialogOpen, setNewYearDialogOpen] = useState(false)
  const [newYear, setNewYear] = useState("")
  const [copyFromYear, setCopyFromYear] = useState("")
  const [creating, setCreating] = useState(false)
  const [savingDeadline, setSavingDeadline] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRates()
  }, [])

  async function fetchRates() {
    try {
      const response = await fetch("/api/admin/rates")
      const data = await response.json()
      setRateCharts(data.rateCharts || [])
    } catch (error) {
      console.error("Error fetching rates:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveRate(rateId: number) {
    const newAmount = editedRates[rateId]
    if (!newAmount) return

    setSaving(rateId)
    try {
      await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_rate",
          rateId,
          amount: parseFloat(newAmount),
        }),
      })
      
      // Update local state
      setRateCharts(prev => prev.map(chart => ({
        ...chart,
        rates: chart.rates.map(rate => 
          rate.id === rateId ? { ...rate, amount: newAmount } : rate
        )
      })))
      
      // Clear edited value
      setEditedRates(prev => {
        const updated = { ...prev }
        delete updated[rateId]
        return updated
      })

      await invalidateCalculatorRates()
    } catch (error) {
      console.error("Error saving rate:", error)
    } finally {
      setSaving(null)
    }
  }

  async function handleSetActive(year: number) {
    try {
      await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_active", year }),
      })
      await fetchRates()
    } catch (error) {
      console.error("Error setting active year:", error)
    }
  }

  async function handleCreateYear() {
    if (!newYear) return
    
    setCreating(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_year",
          year: parseInt(newYear),
          copyFromYear: copyFromYear ? parseInt(copyFromYear) : null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to create year")
        return
      }
      setNewYearDialogOpen(false)
      setNewYear("")
      setCopyFromYear("")
      await fetchRates()
    } catch (err) {
      console.error("Error creating year:", err)
      setError("Failed to create year")
    } finally {
      setCreating(false)
    }
  }

  async function handleSaveDeadline(chartId: number, deadline: string) {
    setSavingDeadline(chartId)
    try {
      await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_deadline",
          chartId,
          deadline: deadline || null,
        }),
      })
      
      // Update local state
      setRateCharts(prev => prev.map(chart => 
        chart.id === chartId ? { ...chart, early_reg_deadline: deadline || null } : chart
      ))
    } catch (err) {
      console.error("Error saving deadline:", err)
    } finally {
      setSavingDeadline(null)
    }
  }

  function groupRatesByCategory(rates: Rate[]) {
    const grouped: Record<string, Rate[]> = {}
    for (const rate of rates) {
      if (!grouped[rate.category]) {
        grouped[rate.category] = []
      }
      grouped[rate.category].push(rate)
    }
    return grouped
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-section-title text-balance">Rate Charts</h1>
          <p className="text-lead text-muted-foreground">
            Manage pricing for registrations and calculator
          </p>
        </div>
        <Dialog open={newYearDialogOpen} onOpenChange={setNewYearDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Year
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Rate Chart</DialogTitle>
              <DialogDescription>
                Create a rate chart for a new year. You can copy rates from an existing year.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  placeholder="e.g., 2027"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="copyFrom">Copy Rates From (Optional)</Label>
                <Select value={copyFromYear || "none"} onValueChange={(val) => setCopyFromYear(val === "none" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Start fresh" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Start fresh</SelectItem>
                    {rateCharts.map((chart) => (
                      <SelectItem key={chart.year} value={chart.year.toString()}>
                        {chart.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error && (
              <div className="callout-destructive rounded-md p-2 text-sm">
                {error}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setNewYearDialogOpen(false); setError(null); }}>
                Cancel
              </Button>
              <Button onClick={handleCreateYear} disabled={!newYear || creating}>
                {creating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rateCharts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Rate Charts</h3>
            <p className="text-muted-foreground mb-4">
              Create your first rate chart to get started.
            </p>
            <Button onClick={() => setNewYearDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rate Chart
            </Button>
          </CardContent>
        </Card>
      ) : (
        rateCharts.map((chart) => {
          const groupedRates = groupRatesByCategory(chart.rates)
          
          return (
            <Card key={chart.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-amount tabular-nums">{chart.year}</CardTitle>
                    {chart.is_active && (
                      <Badge className="border border-success/20 bg-surface-highlight text-success">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                  {!chart.is_active && (
                    <Button 
                      variant="outline" 
                      className="min-h-11"
                      onClick={() => handleSetActive(chart.year)}
                    >
                      Set as Active
                    </Button>
                  )}
                </div>
                <CardDescription>
                  {chart.is_active 
                    ? "This rate chart is currently used for new registrations" 
                    : "Click 'Set as Active' to use these rates for new registrations"
                  }
                </CardDescription>
                
                {/* Early Registration Deadline */}
                <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">Early Registration Deadline:</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={chart.early_reg_deadline?.split('T')[0] || ""}
                        onChange={(e) => handleSaveDeadline(chart.id, e.target.value)}
                        className="w-auto"
                      />
                      {savingDeadline === chart.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground w-full">
                      Registrations after this date will be charged the late registration fee
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(groupedRates).map(([category, rates]) => {
                  const Icon = categoryIcons[category] || DollarSign
                  
                  return (
                    <div key={category} className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {calculatorCategoryLabel(category)}
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {rates.map((rate) => {
                          const isEdited = editedRates[rate.id] !== undefined
                          const displayAmount = editedRates[rate.id] ?? rate.amount
                          
                          return (
                            <div 
                              key={rate.id} 
                              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {rate.label}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {rate.description || ratePricingHint(rate)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={displayAmount}
                                    onChange={(e) => setEditedRates(prev => ({
                                      ...prev,
                                      [rate.id]: e.target.value
                                    }))}
                                    className="w-24 pl-6"
                                  />
                                </div>
                                {isEdited && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleSaveRate(rate.id)}
                                    disabled={saving === rate.id}
                                    aria-label={`Save ${rate.label} rate`}
                                  >
                                    {saving === rate.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    ) : (
                                      <Save className="h-4 w-4" aria-hidden="true" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
