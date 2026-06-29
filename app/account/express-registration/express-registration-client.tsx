"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, CheckCircle2, Loader2, Zap } from "lucide-react"

const LODGING_OPTIONS = [
  { value: "motel-2queen-bunk", label: "Motel — 2 queen + bunk" },
  { value: "motel-2queen", label: "Motel — 2 queen" },
  { value: "motel-king", label: "Motel — king" },
  { value: "rv", label: "RV site" },
  { value: "tent", label: "Tent camping" },
  { value: "drivein", label: "Drive-in / day use" },
]

type ExpressPreferences = {
  lodging_type: string
  occupancy_type?: string | null
  estimated_total?: number | null
  notes?: string | null
}

type Props = {
  familyLastName: string
  familyEmail: string
  suggestedLodging?: string | null
}

export function ExpressRegistrationClient({
  familyLastName,
  familyEmail,
  suggestedLodging,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lodgingType, setLodgingType] = useState(suggestedLodging || "motel-2queen-bunk")
  const [occupancyType, setOccupancyType] = useState("double")
  const [estimatedTotal, setEstimatedTotal] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/express-registration")
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || "Failed to load express registration")
        }
        const prefs = data.preferences as ExpressPreferences | null
        if (prefs) {
          setLodgingType(prefs.lodging_type || suggestedLodging || "motel-2queen-bunk")
          setOccupancyType(prefs.occupancy_type || "double")
          setEstimatedTotal(
            prefs.estimated_total != null ? String(prefs.estimated_total) : "",
          )
          setNotes(prefs.notes || "")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load preferences")
      } finally {
        setLoading(false)
      }
    })()
  }, [suggestedLodging])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch("/api/express-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lodgingType,
          occupancyType,
          memberPreferences: {},
          estimatedTotal: estimatedTotal ? Number(estimatedTotal) : 0,
          notes: notes.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to save express registration")
      }
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preferences")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your express registration preview...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-primary/15 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">{familyLastName} family</p>
            <p className="text-sm text-muted-foreground">{familyEmail}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This preview saves lodging preferences to express_registration_2027 — the same data
              returning families will use when registration opens.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lodging preferences</CardTitle>
          <CardDescription>
            {suggestedLodging
              ? `Pre-filled from your last registration (${suggestedLodging}). Adjust as needed.`
              : "Choose the lodging you expect to request for 2027."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lodgingType">Lodging type</Label>
            <Select value={lodgingType} onValueChange={setLodgingType}>
              <SelectTrigger id="lodgingType">
                <SelectValue placeholder="Select lodging" />
              </SelectTrigger>
              <SelectContent>
                {LODGING_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="occupancyType">Occupancy</Label>
            <Select value={occupancyType} onValueChange={setOccupancyType}>
              <SelectTrigger id="occupancyType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="double">Double</SelectItem>
                <SelectItem value="triple">Triple</SelectItem>
                <SelectItem value="quad">Quad</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedTotal">Estimated total ($)</Label>
            <Input
              id="estimatedTotal"
              type="number"
              min="0"
              step="0.01"
              value={estimatedTotal}
              onChange={(e) => setEstimatedTotal(e.target.value)}
              placeholder="Optional — from calculator"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special requests, arrival notes, etc."
              rows={4}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          {saved ? (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              Express registration preferences saved.
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => void handleSave()} disabled={saving} className="min-h-11">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save express preferences"
              )}
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/account">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to account
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
