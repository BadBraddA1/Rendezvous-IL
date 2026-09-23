"use client"

/**
 * Staff check-in station — QR scan only (no manual code entry / name search).
 * Persistent camera square + good/bad boops.
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Camera, CameraOff, CheckCircle2, RotateCcw, Loader2, FileSignature } from "lucide-react"
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

function playBoop(kind: "good" | "bad") {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(kind === "good" ? [40, 40, 40] : [160])
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)

    if (kind === "good") {
      ;[880, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        osc.type = "sine"
        osc.frequency.value = freq
        osc.connect(gain)
        const start = now + i * 0.11
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(0.45, start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.09)
        osc.start(start)
        osc.stop(start + 0.1)
      })
    } else {
      const osc = ctx.createOscillator()
      osc.type = "square"
      osc.frequency.value = 220
      osc.connect(gain)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.4, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
      osc.start(now)
      osc.stop(now + 0.24)
    }

    window.setTimeout(() => {
      void ctx.close()
    }, 500)
  } catch {
    // ignore
  }
}

function normalizeQrPayload(raw: string): string {
  const trimmed = raw.trim()
  try {
    const url = new URL(trimmed)
    const last = url.pathname.split("/").filter(Boolean).pop()
    return last || trimmed
  } catch {
    return trimmed
  }
}

export function CheckinStation() {
  const [result, setResult] = useState<LookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [scannerActive, setScannerActive] = useState(true)
  const [roomKeys, setRoomKeys] = useState("")
  const [tshirtsDist, setTshirtsDist] = useState(false)
  const [undoConfirmOpen, setUndoConfirmOpen] = useState(false)
  const [pendingSignatures, setPendingSignatures] = useState<string[]>([])
  const [scanError, setScanError] = useState<string | null>(null)
  const [celebrationFamily, setCelebrationFamily] = useState<string | null>(null)
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null)
  const lookupInFlight = useRef(false)
  const celebrationTimer = useRef<number | null>(null)
  const { toast } = useToast()

  const reset = useCallback(() => {
    setResult(null)
    setRoomKeys("")
    setTshirtsDist(false)
    setPendingSignatures([])
    setScannerActive(true)
    setScanError(null)
  }, [])

  const dismissCelebration = useCallback(() => {
    if (celebrationTimer.current != null) {
      window.clearTimeout(celebrationTimer.current)
      celebrationTimer.current = null
    }
    window.speechSynthesis?.cancel()
    setCelebrationFamily(null)
    reset()
  }, [reset])

  const showCelebration = useCallback(
    (familyLastName: string) => {
      if (celebrationTimer.current != null) window.clearTimeout(celebrationTimer.current)
      window.speechSynthesis?.cancel()
      setCelebrationFamily(familyLastName)
      const utter = new SpeechSynthesisUtterance(
        `Congratulations, ${familyLastName} family. You've been checked in.`,
      )
      utter.rate = 1.05
      utter.pitch = 1.05
      window.speechSynthesis?.speak(utter)
      celebrationTimer.current = window.setTimeout(() => {
        dismissCelebration()
      }, 4500)
    },
    [dismissCelebration],
  )

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

  const lookupByCode = useCallback(
    async (rawCode: string) => {
      if (lookupInFlight.current || result) return
      lookupInFlight.current = true
      setLoading(true)
      setScanError(null)
      try {
        const cleaned = normalizeQrPayload(rawCode)
        const res = await fetch(`/api/admin/registrations/qr/${encodeURIComponent(cleaned)}`)
        if (!res.ok) {
          playBoop("bad")
          toast({
            title: "Not found",
            description: "No registration found for that QR",
            variant: "destructive",
          })
          setResult(null)
          return
        }
        const data = await res.json()
        setResult(data)
        setRoomKeys(normalizeStringArray(data.registration?.pre_assigned_keys).join(", "))
        setTshirtsDist(!!data.registration?.tshirts_distributed)
        if (data.registration?.id) void fetchPendingSignatures(data.registration.id)
        playBoop("good")
      } catch (error) {
        console.error("[checkin] Lookup failed:", error)
        playBoop("bad")
        toast({ title: "Error", description: "Lookup failed", variant: "destructive" })
      } finally {
        setLoading(false)
        lookupInFlight.current = false
      }
    },
    [result, toast],
  )

  useEffect(() => {
    const shouldRun = scannerActive && !result
    if (!shouldRun) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
      return
    }

    let mounted = true

    ;(async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode")
        const el = document.getElementById("qr-reader")
        if (!el || !mounted) return
        const html5QrCode = new Html5Qrcode("qr-reader")
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            void lookupByCode(decoded)
          },
          () => {},
        )
        setScanError(null)
      } catch (err) {
        console.error("[checkin] Scanner error:", err)
        setScanError("Could not start camera. Allow camera access and try again.")
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
  }, [scannerActive, result, lookupByCode])

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
          playBoop("bad")
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
      playBoop("good")
      showCelebration(result.registration.family_last_name)
    } catch (error) {
      console.error("[checkin] Check-in failed:", error)
      playBoop("bad")
      toast({ title: "Error", description: "Check-in failed", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleUndoCheckIn = async () => {
    if (!result) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/registrations/${result.registration.id}/checkin`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed")
      const refreshed = await fetch(`/api/admin/registrations/${result.registration.id}/full`).then(
        (r) => r.json(),
      )
      setResult({
        registration: refreshed.registration,
        family_members: refreshed.family_members || [],
        tshirt_orders: refreshed.tshirt_orders || [],
      })
      setRoomKeys("")
      setTshirtsDist(false)
      setUndoConfirmOpen(false)
      playBoop("good")
      toast({ title: "Check-in undone" })
    } catch (error) {
      console.error("[checkin] Undo failed:", error)
      playBoop("bad")
      toast({ title: "Error", description: "Undo failed", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {celebrationFamily ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-3 border-0 bg-emerald-500/92 p-6 text-center animate-in fade-in duration-200"
          onClick={dismissCelebration}
          aria-live="assertive"
          role="status"
        >
          <span
            className="pointer-events-none absolute inset-0 animate-pulse bg-emerald-400/35"
            aria-hidden
          />
          {Array.from({ length: 48 }, (_, i) => {
            const colors = ["#FFD60A", "#FF375F", "#5AC8FA", "#FFFFFF", "#BF5AF2", "#30D158"]
            const left = ((i * 37) % 100)
            const delay = (i % 12) * 0.05
            const duration = 1.8 + (i % 5) * 0.25
            return (
              <span
                key={i}
                className="pointer-events-none absolute top-[-8%] h-2.5 w-2 rounded-sm"
                style={{
                  left: `${left}%`,
                  backgroundColor: colors[i % colors.length],
                  animation: `ren-confetti-fall ${duration}s linear ${delay}s both`,
                  transform: `rotate(${(i * 23) % 360}deg)`,
                }}
                aria-hidden
              />
            )
          })}
          <style
            dangerouslySetInnerHTML={{
              __html: `@keyframes ren-confetti-fall{0%{transform:translate3d(0,0,0) rotate(0deg);opacity:1}100%{transform:translate3d(0,110vh,0) rotate(540deg);opacity:.85}}`,
            }}
          />
          <p className="relative z-10 text-3xl font-black tracking-tight text-white drop-shadow-md sm:text-5xl">
            You&apos;ve been checked in! 🎉
          </p>
          <p className="relative z-10 text-lg font-semibold text-white/95 sm:text-2xl">
            Congratulations, {celebrationFamily} family
          </p>
          <p className="relative z-10 text-sm text-white/75">Tap to dismiss</p>
        </button>
      ) : null}
      <div className="grid gap-6">
        {!result ? (
        <Card>
          <CardHeader>
            <CardTitle>Scan family QR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              id="qr-reader"
              className="mx-auto aspect-square w-full max-w-md overflow-hidden rounded-xl border bg-muted"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => setScannerActive((s) => !s)}
                variant={scannerActive ? "destructive" : "default"}
                className="flex-1 gap-2"
              >
                {scannerActive ? (
                  <>
                    <CameraOff className="h-4 w-4" />
                    Pause camera
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    Resume camera
                  </>
                )}
              </Button>
            </div>
            {scanError ? (
              <p className="text-xs text-destructive">{scanError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {loading
                  ? "Looking up…"
                  : "Camera stays on. Point at a printed or phone QR — lookup is automatic."}
              </p>
            )}
          </CardContent>
        </Card>
        ) : (
        <Card>
          <CardHeader>
            <CardTitle>Family Details</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-subheading">{result.registration.family_last_name} Family</h3>
                    {result.registration.checked_in ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Checked In
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
                    <p className="text-sm font-medium capitalize">
                      {result.registration.lodging_type || "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">Members</p>
                    <p className="text-sm font-medium">{result.family_members.length}</p>
                  </div>
                  <div className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">Payment</p>
                    <p className="text-sm font-medium">
                      {result.registration.full_payment_paid
                        ? "Paid"
                        : result.registration.registration_fee_paid
                          ? "Reg Fee"
                          : "Unpaid"}
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
                        it signed from this family&apos;s registration page.
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
                        Pre-assigned:{" "}
                        {normalizeStringArray(result.registration.pre_assigned_keys).join(", ")}
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
                    <Label htmlFor="tshirts-given" className="cursor-pointer">
                      T-shirts handed out
                    </Label>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {result.registration.checked_in ? (
                      <Button
                        onClick={() => setUndoConfirmOpen(true)}
                        variant="outline"
                        className="flex-1 gap-2 bg-transparent"
                        disabled={loading}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Undo Check-In
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCheckIn}
                        className="flex-1 gap-2"
                        disabled={loading || pendingSignatures.length > 0}
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Finalize
                      </Button>
                    )}
                    {result.registration.checked_in ? (
                      <Button onClick={reset} variant="secondary" className="flex-1">
                        Scan next family
                      </Button>
                    ) : null}
                  </div>
                  {!result.registration.checked_in ? (
                    <Button onClick={reset} variant="ghost" className="w-full">
                      Wrong family — scan again
                    </Button>
                  ) : null}
                </div>
              </div>
          </CardContent>
        </Card>
        )}
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
