"use client"

/**
 * PLANNED: Remove search-by-family-name-or-email from check-in.
 * Keep QR scan + code entry only (see README “Planned — check-in lookup”).
 */

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { QrCode, Search, Camera, CameraOff, CheckCircle2, RotateCcw, Loader2, FileSignature } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { AdminConfirmDialog } from "./admin-confirm-dialog"
import { normalizeStringArray } from "@/lib/normalize-string-array"

type Registration = {
  id: number
  family_last_name: string
  email: string
  husband_phone?: string
  wife_phone?: string
  lodging_type?: string
  checkin_qr_code?: string
  checked_in?: boolean
  checked_in_at?: string | null
  room_keys?: string[]
  pre_assigned_keys?: string[]
  tshirts_distributed?: boolean
  full_payment_paid?: boolean
  registration_fee_paid?: boolean
}

type FamilyMember = {
  id: number
  first_name: string
  last_name?: string
  age: number
}

type TshirtOrder = {
  id: number
  size: string
  color: string
  quantity: number
}

type LookupResult = {
  registration: Registration
  family_members: FamilyMember[]
  tshirt_orders: TshirtOrder[]
}

export function CheckinStation() {
  const [code, setCode] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Registration[]>([])
  const [result, setResult] = useState<LookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [scannerActive, setScannerActive] = useState(false)
  const [roomKeys, setRoomKeys] = useState("")
  const [tshirtsDist, setTshirtsDist] = useState(false)
  const [undoConfirmOpen, setUndoConfirmOpen] = useState(false)
  const [pendingSignatures, setPendingSignatures] = useState<string[]>([])
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null)
  const { toast } = useToast()

  // QR Code Scanner
  useEffect(() => {
    if (!scannerActive) return
    let mounted = true

    ;(async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode")
        const html5QrCode = new Html5Qrcode("qr-reader")
        if (!mounted) return
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            setCode(decoded)
            void lookupByCode(decoded)
            void html5QrCode.stop()
            setScannerActive(false)
          },
          () => {
            // ignore scan errors
          },
        )
      } catch (err) {
        console.error("[v0] Scanner error:", err)
        toast({ title: "Camera error", description: "Could not start camera. Use manual entry.", variant: "destructive" })
        setScannerActive(false)
      }
    })()

    return () => {
      mounted = false
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerActive])

  /** Signing emails feature: names of parents who still need to sign (only when enforced). */
  const fetchPendingSignatures = async (registrationId: number) => {
    try {
      const res = await fetch(`/api/admin/registrations/${registrationId}/signatures`)
      if (!res.ok) {
        setPendingSignatures([])
        return
      }
      const data = await res.json()
      if (!data.enforced || !Array.isArray(data.requests)) {
        setPendingSignatures([])
        return
      }
      setPendingSignatures(
        data.requests
          .filter((r: { signed_at: string | null }) => !r.signed_at)
          .map((r: { parent_name: string }) => r.parent_name),
      )
    } catch {
      setPendingSignatures([])
    }
  }

  const lookupByCode = async (rawCode: string) => {
    setLoading(true)
    setSearchResults([])
    try {
      const cleaned = rawCode.trim()
      const res = await fetch(`/api/admin/registrations/qr/${encodeURIComponent(cleaned)}`)
      if (!res.ok) {
        toast({ title: "Not found", description: `No registration found for code ${cleaned}`, variant: "destructive" })
        setResult(null)
        return
      }
      const data = await res.json()
      setResult(data)
      setRoomKeys(normalizeStringArray(data.registration?.pre_assigned_keys).join(", "))
      setTshirtsDist(!!data.registration?.tshirts_distributed)
      if (data.registration?.id) void fetchPendingSignatures(data.registration.id)
    } catch (error) {
      console.error("[v0] Lookup failed:", error)
      toast({ title: "Error", description: "Lookup failed", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/admin/registrations?search=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setSearchResults(data)
        if (data.length === 0) {
          toast({ title: "No matches", description: "No families match that search." })
        }
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error("[v0] Search failed:", error)
      toast({ title: "Error", description: "Search failed", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const selectFromSearch = async (reg: Registration) => {
    setSearchResults([])
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/registrations/${reg.id}/full`)
      const data = await res.json()
      setResult({
        registration: data.registration,
        family_members: data.family_members || [],
        tshirt_orders: data.tshirt_orders || [],
      })
      setRoomKeys(normalizeStringArray(data.registration?.pre_assigned_keys).join(", "))
      setTshirtsDist(!!data.registration?.tshirts_distributed)
      void fetchPendingSignatures(reg.id)
    } catch (error) {
      console.error("[v0] Could not load:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    if (!result) return
    const keys = roomKeys.split(",").map((k) => k.trim()).filter(Boolean)
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/registrations/${result.registration.id}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_keys: keys, tshirts_distributed: tshirtsDist }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 409) {
          if (Array.isArray(data.pendingSignatures)) setPendingSignatures(data.pendingSignatures)
          toast({
            title: "Signatures pending",
            description: data.error || "Both parents must sign before check-in.",
            variant: "destructive",
          })
          return
        }
        throw new Error(data.error || "Failed")
      }
      const data = await res.json()
      setResult({ ...result, registration: data.registration })
      toast({ title: "Checked in!", description: `${result.registration.family_last_name} family is checked in.` })
    } catch (error) {
      console.error("[v0] Check-in failed:", error)
      toast({ title: "Error", description: "Check-in failed", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleUndoCheckIn = async () => {
    if (!result) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/registrations/${result.registration.id}/checkin`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      const refreshed = await fetch(`/api/admin/registrations/${result.registration.id}/full`).then((r) => r.json())
      setResult({
        registration: refreshed.registration,
        family_members: refreshed.family_members || [],
        tshirt_orders: refreshed.tshirt_orders || [],
      })
      setRoomKeys("")
      setTshirtsDist(false)
      setUndoConfirmOpen(false)
      toast({ title: "Check-in undone" })
    } catch (error) {
      console.error("[v0] Undo failed:", error)
      toast({ title: "Error", description: "Undo failed", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setResult(null)
    setCode("")
    setSearchQuery("")
    setSearchResults([])
    setRoomKeys("")
    setTshirtsDist(false)
    setPendingSignatures([])
  }

  return (
    <>
    <div className="grid gap-6 md:grid-cols-2">
      {/* INPUT SIDE */}
      <Card>
        <CardHeader>
          <CardTitle>Find Family</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="code" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="code"><QrCode className="mr-2 h-4 w-4" />Code</TabsTrigger>
              <TabsTrigger value="scanner"><Camera className="mr-2 h-4 w-4" />Scan</TabsTrigger>
              <TabsTrigger value="search"><Search className="mr-2 h-4 w-4" />Search</TabsTrigger>
            </TabsList>

            <TabsContent value="code" className="space-y-3">
              <Label>10-Digit QR Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ABC1234567"
                className="font-mono text-lg tracking-widest"
                onKeyDown={(e) => e.key === "Enter" && lookupByCode(code)}
              />
              <Button onClick={() => lookupByCode(code)} disabled={!code || loading} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Look Up Family
              </Button>
            </TabsContent>

            <TabsContent value="scanner" className="space-y-3">
              <div id="qr-reader" className="overflow-hidden rounded-lg border bg-muted aspect-square w-full" />
              <div className="flex gap-2">
                <Button
                  onClick={() => setScannerActive((s) => !s)}
                  variant={scannerActive ? "destructive" : "default"}
                  className="flex-1 gap-2"
                >
                  {scannerActive ? <><CameraOff className="h-4 w-4" />Stop Camera</> : <><Camera className="h-4 w-4" />Start Camera</>}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Allow camera access. The scanner reads QR codes from a phone or printed card.</p>
            </TabsContent>

            <TabsContent value="search" className="space-y-3">
              <Label>Family Last Name or Email</Label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Smith or smith@example.com"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={!searchQuery || loading} className="w-full">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Search
              </Button>
              {searchResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => selectFromSearch(r)}
                      className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-accent"
                    >
                      <div>
                        <p className="font-medium">{r.family_last_name} Family</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </div>
                      {r.checked_in ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />In
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not in</Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* RESULT SIDE */}
      <Card>
        <CardHeader>
          <CardTitle>Family Details</CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="flex h-full min-h-[300px] items-center justify-center text-center">
              <p className="text-sm text-muted-foreground">
                Look up a family by QR code or name to begin check-in.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-subheading">{result.registration.family_last_name} Family</h3>
                  {result.registration.checked_in ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />Checked In
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not Yet Checked In</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{result.registration.email}</p>
                {result.registration.husband_phone && (
                  <p className="text-xs text-muted-foreground">{result.registration.husband_phone}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border p-2">
                  <p className="text-xs text-muted-foreground">Lodging</p>
                  <p className="text-sm font-medium capitalize">{result.registration.lodging_type || "—"}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-xs text-muted-foreground">Members</p>
                  <p className="text-sm font-medium">{result.family_members.length}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <p className="text-sm font-medium">
                    {result.registration.full_payment_paid ? "Paid" : result.registration.registration_fee_paid ? "Reg Fee" : "Unpaid"}
                  </p>
                </div>
              </div>

              {result.family_members.length > 0 && (
                <div>
                  <Label className="text-xs">Family Members</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {result.family_members.map((m) => (
                      <Badge key={m.id} variant="secondary">
                        {m.first_name} ({m.age})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.tshirt_orders.length > 0 && (
                <div>
                  <Label className="text-xs">T-Shirts Ordered</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {result.tshirt_orders.map((t) => (
                      <Badge key={t.id} variant="outline">
                        {t.quantity}x {t.size} {t.color}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {pendingSignatures.length > 0 && !result.registration.checked_in && (
                <div className="callout-destructive flex items-start gap-3 rounded-lg border p-3">
                  <FileSignature className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <div className="text-sm">
                    <p className="font-medium">Signatures pending — check-in blocked</p>
                    <p>
                      Waiting on: {pendingSignatures.join(", ")}. Resend the signing email or mark
                      it signed from this family's registration page.
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <div>
                  <Label>Room Keys (comma-separated)</Label>
                  <Input
                    value={roomKeys}
                    onChange={(e) => setRoomKeys(e.target.value)}
                    placeholder="101, 102"
                    disabled={result.registration.checked_in}
                  />
                  {normalizeStringArray(result.registration.pre_assigned_keys).length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pre-assigned: {normalizeStringArray(result.registration.pre_assigned_keys).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="tshirts-given"
                    checked={tshirtsDist}
                    onCheckedChange={(c) => setTshirtsDist(!!c)}
                    disabled={result.registration.checked_in}
                  />
                  <Label htmlFor="tshirts-given" className="cursor-pointer">T-shirts handed out</Label>
                </div>
              </div>

              <div className="flex gap-2">
                {result.registration.checked_in ? (
                  <Button onClick={() => setUndoConfirmOpen(true)} variant="outline" className="flex-1 gap-2 bg-transparent" disabled={loading}>
                    <RotateCcw className="h-4 w-4" />Undo Check-In
                  </Button>
                ) : (
                  <Button
                    onClick={handleCheckIn}
                    className="flex-1 gap-2"
                    disabled={loading || pendingSignatures.length > 0}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Check In Family
                  </Button>
                )}
                <Button onClick={reset} variant="ghost">Reset</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    <AdminConfirmDialog
      open={undoConfirmOpen}
      onOpenChange={setUndoConfirmOpen}
      title="Undo check-in?"
      description={
        result
          ? `Undo check-in for the ${result.registration.family_last_name} family? They will need to check in again.`
          : ""
      }
      confirmLabel="Undo check-in"
      loading={loading}
      onConfirm={handleUndoCheckIn}
    />
    </>
  )
}
