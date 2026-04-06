"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"

interface SystemSettingsProps {
  adminRole: string
}

export function SystemSettings({ adminRole }: SystemSettingsProps) {
  const [settings, setSettings] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then(setSettings)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const isReadOnly = adminRole === "viewer"

  return (
    <div className="space-y-6">
      {saved && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>Settings saved successfully!</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Registration Control</CardTitle>
          <CardDescription>Enable or disable public registration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="registration-enabled">Registration Enabled</Label>
              <p className="text-sm text-muted-foreground">Allow families to submit new registrations</p>
            </div>
            <Switch
              id="registration-enabled"
              checked={settings.registration_enabled === "true"}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, registration_enabled: checked ? "true" : "false" })
              }
              disabled={isReadOnly}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event Dates</CardTitle>
          <CardDescription>Configure important dates for the event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="early-bird">Early Bird Deadline</Label>
              <Input
                id="early-bird"
                type="date"
                value={settings.early_bird_deadline || ""}
                onChange={(e) => setSettings({ ...settings, early_bird_deadline: e.target.value })}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration-deadline">Registration Deadline</Label>
              <Input
                id="registration-deadline"
                type="date"
                value={settings.registration_deadline || ""}
                onChange={(e) => setSettings({ ...settings, registration_deadline: e.target.value })}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-start">Event Start Date</Label>
              <Input
                id="event-start"
                type="date"
                value={settings.event_start_date || ""}
                onChange={(e) => setSettings({ ...settings, event_start_date: e.target.value })}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-end">Event End Date</Label>
              <Input
                id="event-end"
                type="date"
                value={settings.event_end_date || ""}
                onChange={(e) => setSettings({ ...settings, event_end_date: e.target.value })}
                disabled={isReadOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {!isReadOnly && (
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      )}
    </div>
  )
}
