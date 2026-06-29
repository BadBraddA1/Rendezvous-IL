"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Save, QrCode, CheckCircle2, RotateCcw, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AdminConfirmDialog } from "./admin-confirm-dialog"
import { normalizeStringArray } from "@/lib/normalize-string-array"
import {
  registrationYearLabel,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"
import { cn } from "@/lib/utils"

type Registration = {
  id: string | number
  family_last_name?: string
  email?: string
  husband_phone?: string
  wife_phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  home_congregation?: string
  lodging_type?: string
  lodging_total?: number
  tshirt_total?: number
  climbing_tower_total?: number
  registration_fee?: number
  scholarship_donation?: number
  scholarship_requested?: boolean
  total_cost?: number
  attendee_count?: number
  registration_fee_paid?: boolean
  full_payment_paid?: boolean
  payment_notes?: string
  arrival_notes?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  checkin_qr_code?: string
  checked_in?: boolean
  checked_in_at?: string | null
  room_keys?: string[]
  pre_assigned_keys?: string[]
  keys_taken_count?: number
  keys_returned?: boolean
  tshirts_distributed?: boolean
  created_at?: string
}

type FamilyMember = {
  id?: number
  first_name: string
  last_name?: string
  date_of_birth: string
  age: number
  is_baptized: boolean
  person_cost: number
  rate_key?: string
  is_adult_override?: boolean
}

type TshirtOrder = {
  id?: number
  size: string
  color: string
  quantity: number
  price: number
}

type Volunteer = {
  id: number
  volunteer_name: string
  volunteer_type?: string
  notes?: string
}

type HealthInfo = {
  id: number
  full_name: string
  condition: string
  medication_on_hand?: boolean
}

type ConfirmAction =
  | { kind: "removeMember"; index: number; name: string }
  | { kind: "removeTshirt"; index: number }
  | { kind: "removeVolunteer"; id: number }
  | { kind: "undoCheckIn"; familyName: string }

type Props = {
  registrationId: string
  eventYear: RegistrationEventYear
}

const TSHIRT_SIZES = ["YS", "YM", "YL", "S", "M", "L", "XL", "2XL", "3XL"]
const TSHIRT_COLORS = ["sage", "navy", "white", "black", "gray"]

type SectionConfig = {
  id: string
  label: string
  description: string
  count?: number
}

function EditSection({
  id,
  title,
  description,
  count,
  children,
}: {
  id: string
  title: string
  description: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-40 rounded-xl border bg-card shadow-sm">
      <div className="border-b bg-muted/50 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {count !== undefined && (
            <Badge variant="secondary" className="shrink-0 text-sm tabular-nums">
              {count} {count === 1 ? "item" : "items"}
            </Badge>
          )}
        </div>
      </div>
      <div className="space-y-4 p-5 sm:p-6">{children}</div>
    </section>
  )
}

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

export function RegistrationEditForm({ registrationId, eventYear }: Props) {
  const [reg, setReg] = useState<Registration | null>(null)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [tshirtOrders, setTshirtOrders] = useState<TshirtOrder[]>([])
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [healthInfo, setHealthInfo] = useState<HealthInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState("contact")
  const [roomKeysInput, setRoomKeysInput] = useState("")
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const { toast } = useToast()

  const loadFullRegistration = useCallback(
    async (regId: string | number) => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/registrations/${regId}/full`)
        if (!res.ok) throw new Error("Failed to load registration")
        const data = await res.json()
        const registration = {
          ...data.registration,
          room_keys: normalizeStringArray(data.registration?.room_keys),
          pre_assigned_keys: normalizeStringArray(data.registration?.pre_assigned_keys),
        }
        setReg(registration)
        setFamilyMembers(data.family_members || [])
        setTshirtOrders(data.tshirt_orders || [])
        setVolunteers(data.volunteers || [])
        setHealthInfo(data.health_info || [])
        setRoomKeysInput(registration.room_keys.join(", "))
      } catch (error) {
        console.error("[v0] Failed to load registration details:", error)
        toast({
          title: "Error",
          description: "Failed to load registration details",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    setActiveSection("contact")
    void loadFullRegistration(registrationId)
  }, [registrationId, loadFullRegistration])

  useEffect(() => {
    const sectionIds = ["contact", "attendees", "tshirts", "volunteers", "payment", "checkin", "health"]
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id)
        }
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    )

    for (const id of sectionIds) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }

    return () => observer.disconnect()
  }, [loading, reg])

  const updateRegField = (field: keyof Registration, value: unknown) => {
    setReg((prev) => (prev ? ({ ...prev, [field]: value } as Registration) : prev))
  }

  // ---------- SAVE TOP-LEVEL CONTACT/PAYMENT FIELDS ----------
  const saveRegistration = async () => {
    if (!reg) return
    setSaving(true)
    try {
      const payload = {
        family_last_name: reg.family_last_name,
        email: reg.email,
        husband_phone: reg.husband_phone,
        wife_phone: reg.wife_phone,
        address: reg.address,
        city: reg.city,
        state: reg.state,
        zip: reg.zip,
        home_congregation: reg.home_congregation,
        lodging_type: reg.lodging_type,
        registration_fee: reg.registration_fee,
        registration_fee_paid: reg.registration_fee_paid,
        full_payment_paid: reg.full_payment_paid,
        payment_notes: reg.payment_notes,
        arrival_notes: reg.arrival_notes,
        emergency_contact_name: reg.emergency_contact_name,
        emergency_contact_phone: reg.emergency_contact_phone,
        emergency_contact_relationship: reg.emergency_contact_relationship,
      }
      const res = await fetch(`/api/admin/registrations/${reg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to save")
      toast({ title: "Saved", description: "Registration updated successfully" })
    } catch (error) {
      console.error("[v0] Save failed:", error)
      toast({ title: "Error", description: "Failed to save changes", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // ---------- FAMILY MEMBERS ----------
  const addFamilyMember = async () => {
    if (!reg) return
    const newMember = {
      first_name: "",
      last_name: reg.family_last_name || "",
      date_of_birth: "",
      age: 0,
      is_baptized: false,
      person_cost: 0,
    }
    try {
      const res = await fetch(`/api/admin/registrations/${reg.id}/family-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setFamilyMembers((prev) => [...prev, data.member])
      updateRegField("lodging_total", data.lodging_total)
      toast({ title: "Member added" })
    } catch {
      toast({ title: "Error", description: "Could not add member", variant: "destructive" })
    }
  }

  const updateFamilyMember = (index: number, field: keyof FamilyMember, value: unknown) => {
    setFamilyMembers((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      if (field === "date_of_birth" && typeof value === "string" && value) {
        const birth = new Date(value)
        const today = new Date()
        let age = today.getFullYear() - birth.getFullYear()
        const m = today.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
        updated[index].age = age
      }
      return updated
    })
  }

  const persistFamilyMember = async (index: number) => {
    if (!reg) return
    const member = familyMembers[index]
    if (!member.id) return
    try {
      const res = await fetch(`/api/admin/registrations/${reg.id}/family-members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(member),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      updateRegField("lodging_total", data.lodging_total)
      toast({ title: "Member updated" })
    } catch {
      toast({ title: "Error", description: "Could not update member", variant: "destructive" })
    }
  }

  const removeFamilyMember = async (index: number) => {
    if (!reg) return
    const member = familyMembers[index]
    if (!member.id) {
      setFamilyMembers((prev) => prev.filter((_, i) => i !== index))
      return
    }
    try {
      const res = await fetch(`/api/admin/registrations/${reg.id}/family-members/${member.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setFamilyMembers((prev) => prev.filter((_, i) => i !== index))
      updateRegField("lodging_total", data.lodging_total)
      toast({ title: "Member removed" })
    } catch {
      toast({ title: "Error", description: "Could not remove member", variant: "destructive" })
    }
  }

  const requestRemoveFamilyMember = (index: number) => {
    const member = familyMembers[index]
    if (!member.id) {
      void removeFamilyMember(index)
      return
    }
    setConfirmAction({
      kind: "removeMember",
      index,
      name: member.first_name || "this member",
    })
  }

  // ---------- T-SHIRTS ----------
  const addTshirt = async () => {
    if (!reg) return
    const newOrder = { size: "M", color: "sage", quantity: 1, price: 25 }
    try {
      const res = await fetch(`/api/admin/registrations/${reg.id}/tshirts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setTshirtOrders((prev) => [...prev, data.order])
      updateRegField("tshirt_total", data.tshirt_total)
    } catch {
      toast({ title: "Error", description: "Could not add t-shirt", variant: "destructive" })
    }
  }

  const updateTshirt = (index: number, field: keyof TshirtOrder, value: unknown) => {
    setTshirtOrders((prev) => {
      const u = [...prev]
      u[index] = { ...u[index], [field]: value }
      return u
    })
  }

  const persistTshirt = async (index: number) => {
    if (!reg) return
    const order = tshirtOrders[index]
    if (!order.id) return
    try {
      const res = await fetch(`/api/admin/registrations/${reg.id}/tshirts/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      updateRegField("tshirt_total", data.tshirt_total)
    } catch {
      toast({ title: "Error", description: "Could not update t-shirt", variant: "destructive" })
    }
  }

  const removeTshirt = async (index: number) => {
    if (!reg) return
    const order = tshirtOrders[index]
    if (!order.id) {
      setTshirtOrders((prev) => prev.filter((_, i) => i !== index))
      return
    }
    try {
      const res = await fetch(`/api/admin/registrations/${reg.id}/tshirts/${order.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setTshirtOrders((prev) => prev.filter((_, i) => i !== index))
      updateRegField("tshirt_total", data.tshirt_total)
    } catch {
      toast({ title: "Error", description: "Could not remove t-shirt", variant: "destructive" })
    }
  }

  const requestRemoveTshirt = (index: number) => {
    const order = tshirtOrders[index]
    if (!order.id) {
      void removeTshirt(index)
      return
    }
    setConfirmAction({ kind: "removeTshirt", index })
  }

  // ---------- VOLUNTEERS ----------
  const removeVolunteer = async (id: number) => {
    if (!reg) return
    try {
      const res = await fetch(`/api/admin/registrations/${reg.id}/volunteers/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      setVolunteers((prev) => prev.filter((v) => v.id !== id))
    } catch {
      toast({ title: "Error", description: "Could not remove volunteer", variant: "destructive" })
    }
  }

  const requestRemoveVolunteer = (id: number) => {
    setConfirmAction({ kind: "removeVolunteer", id })
  }

  // ---------- CHECK-IN ----------
  const handleCheckIn = async () => {
    if (!reg) return
    const keys = roomKeysInput
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
    try {
      const res = await fetch(`/api/admin/registrations/${reg.id}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_keys: keys, tshirts_distributed: reg.tshirts_distributed ?? false }),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setReg(data.registration)
      toast({ title: "Checked in", description: `${reg.family_last_name} family checked in.` })
    } catch {
      toast({ title: "Error", description: "Could not check in", variant: "destructive" })
    }
  }

  const handleUndoCheckIn = async () => {
    if (!reg) return
    try {
      const res = await fetch(`/api/admin/registrations/${reg.id}/checkin`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      const refreshed = await fetch(`/api/admin/registrations/${reg.id}/full`).then((r) => r.json())
      setReg(refreshed.registration)
      setRoomKeysInput("")
      toast({ title: "Check-in undone" })
    } catch {
      toast({ title: "Error", description: "Could not undo check-in", variant: "destructive" })
    }
  }

  const requestUndoCheckIn = () => {
    if (!reg) return
    setConfirmAction({ kind: "undoCheckIn", familyName: reg.family_last_name || "this" })
  }

  const handleConfirmAction = async () => {
    if (!confirmAction) return
    setConfirmLoading(true)
    try {
      switch (confirmAction.kind) {
        case "removeMember":
          await removeFamilyMember(confirmAction.index)
          break
        case "removeTshirt":
          await removeTshirt(confirmAction.index)
          break
        case "removeVolunteer":
          await removeVolunteer(confirmAction.id)
          break
        case "undoCheckIn":
          await handleUndoCheckIn()
          break
      }
      setConfirmAction(null)
    } finally {
      setConfirmLoading(false)
    }
  }

  const confirmCopy = (() => {
    if (!confirmAction) return null
    switch (confirmAction.kind) {
      case "removeMember":
        return {
          title: "Remove family member?",
          description: `Remove ${confirmAction.name} from this registration? Lodging totals will be recalculated.`,
          confirmLabel: "Remove member",
        }
      case "removeTshirt":
        return {
          title: "Remove t-shirt order?",
          description: "Remove this t-shirt order from the registration?",
          confirmLabel: "Remove order",
        }
      case "removeVolunteer":
        return {
          title: "Remove volunteer signup?",
          description: "Remove this volunteer signup from the registration?",
          confirmLabel: "Remove signup",
        }
      case "undoCheckIn":
        return {
          title: "Undo check-in?",
          description: `Undo check-in for the ${confirmAction.familyName} family? They will need to check in again.`,
          confirmLabel: "Undo check-in",
        }
    }
  })()

  const handleKeysReturned = async () => {
    if (!reg) return
    try {
      const res = await fetch(`/api/admin/registrations/${reg.id}/checkin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys_returned: !reg.keys_returned }),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setReg(data.registration)
    } catch {
      toast({ title: "Error", description: "Could not update keys", variant: "destructive" })
    }
  }

  const toggleTshirtDistributed = async () => {
    if (!reg) return
    try {
      const res = await fetch(`/api/admin/registrations/${reg.id}/checkin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tshirts_distributed: !reg.tshirts_distributed }),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setReg(data.registration)
    } catch {
      toast({ title: "Error", description: "Could not update t-shirt status", variant: "destructive" })
    }
  }

  // ---------- DERIVED ----------
  const lodgingTotal = Number(reg?.lodging_total ?? 0)
  const tshirtTotal = Number(reg?.tshirt_total ?? 0)
  const climbingTotal = Number(reg?.climbing_tower_total ?? 0)
  const regFee = Number(reg?.registration_fee ?? 0)
  const scholarshipDonation = Number(reg?.scholarship_donation ?? 0)
  const totalCost = lodgingTotal + tshirtTotal + climbingTotal + regFee + scholarshipDonation
  const paidAmount = reg?.full_payment_paid
    ? totalCost
    : reg?.registration_fee_paid
      ? regFee
      : 0
  const paymentProgress = totalCost > 0 ? Math.min(100, (paidAmount / totalCost) * 100) : 0

  const sections: SectionConfig[] = useMemo(
    () => [
      { id: "contact", label: "Contact", description: "Family contact info, address, lodging, and emergency contact" },
      {
        id: "attendees",
        label: "Attendees",
        description: "Everyone registered for this event — ages, costs, baptism status",
        count: familyMembers.length,
      },
      {
        id: "tshirts",
        label: "T-Shirts",
        description: "Merchandise orders and sizes",
        count: tshirtOrders.length,
      },
      {
        id: "volunteers",
        label: "Volunteers",
        description: "Worship and service signups from registration",
        count: volunteers.length,
      },
      { id: "payment", label: "Payment", description: "Fees, payment status, notes, and cost breakdown" },
      { id: "checkin", label: "Check-In", description: "QR code, room keys, and on-site status" },
      {
        id: "health",
        label: "Health",
        description: "Medical conditions and medication notes",
        count: healthInfo.length,
      },
    ],
    [familyMembers.length, healthInfo.length, tshirtOrders.length, volunteers.length],
  )

  const backHref = `/admin/registrations?year=${eventYear}`

  if (loading || !reg) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Loading registration details...</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit gap-2">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              Back to {registrationYearLabel(eventYear)} list
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-section-title text-balance">
              {reg.family_last_name} Family
            </h1>
            <Badge variant="outline">{registrationYearLabel(eventYear)}</Badge>
            {reg.checked_in && (
              <Badge className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Checked In
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Registration #{reg.id} · {reg.email} · Registered{" "}
            {reg.created_at ? new Date(reg.created_at).toLocaleDateString() : "—"}
          </p>
        </div>
        <Button onClick={saveRegistration} disabled={saving} className="min-h-11 shrink-0 gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Contact & Payment"}
        </Button>
      </div>

      <nav
        aria-label="Registration sections"
        className="sticky top-0 z-20 -mx-1 mb-6 rounded-xl border bg-background/95 px-2 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85"
      >
        <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Jump to section
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
                activeSection === section.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              <span>{section.label}</span>
              {section.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs tabular-nums",
                    activeSection === section.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {section.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="space-y-8 pb-24">
        <EditSection
          id="contact"
          title="Contact Information"
          description="Primary family contact details, address, lodging choice, and arrival notes."
        >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Family Last Name</Label>
                  <Input value={reg.family_last_name || ""} onChange={(e) => updateRegField("family_last_name", e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={reg.email || ""} onChange={(e) => updateRegField("email", e.target.value)} />
                </div>
                <div>
                  <Label>Husband Phone</Label>
                  <Input value={reg.husband_phone || ""} onChange={(e) => updateRegField("husband_phone", e.target.value)} />
                </div>
                <div>
                  <Label>Wife Phone</Label>
                  <Input value={reg.wife_phone || ""} onChange={(e) => updateRegField("wife_phone", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Input value={reg.address || ""} onChange={(e) => updateRegField("address", e.target.value)} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={reg.city || ""} onChange={(e) => updateRegField("city", e.target.value)} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={reg.state || ""} onChange={(e) => updateRegField("state", e.target.value)} />
                </div>
                <div>
                  <Label>Zip</Label>
                  <Input value={reg.zip || ""} onChange={(e) => updateRegField("zip", e.target.value)} />
                </div>
                <div>
                  <Label>Home Congregation</Label>
                  <Input value={reg.home_congregation || ""} onChange={(e) => updateRegField("home_congregation", e.target.value)} />
                </div>
                <div>
                  <Label>Lodging Type</Label>
                  <Select value={reg.lodging_type || ""} onValueChange={(v) => updateRegField("lodging_type", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tent">Tent</SelectItem>
                      <SelectItem value="rv">RV</SelectItem>
                      <SelectItem value="commuting">Commuting</SelectItem>
                      <SelectItem value="motel-1queen-2bunk">Motel - 1 Queen + 2 Bunk</SelectItem>
                      <SelectItem value="motel-2queen">Motel - 2 Queen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Arrival Notes</Label>
                  <Textarea
                    value={reg.arrival_notes || ""}
                    onChange={(e) => updateRegField("arrival_notes", e.target.value)}
                    rows={2}
                    placeholder="e.g. Arriving Monday evening"
                  />
                </div>
              </div>

              <Separator />
              <h4 className="text-sm font-semibold">Emergency Contact</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Name</Label>
                  <Input value={reg.emergency_contact_name || ""} onChange={(e) => updateRegField("emergency_contact_name", e.target.value)} />
                </div>
                <div>
                  <Label>Relationship</Label>
                  <Input value={reg.emergency_contact_relationship || ""} onChange={(e) => updateRegField("emergency_contact_relationship", e.target.value)} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={reg.emergency_contact_phone || ""} onChange={(e) => updateRegField("emergency_contact_phone", e.target.value)} />
                </div>
              </div>
        </EditSection>

        <EditSection
          id="attendees"
          title="Attendees"
          description="Each person on this registration. Save individual members after editing."
          count={familyMembers.length}
        >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Manage individual family members. Changes save when you click Save Member.</p>
                <Button onClick={addFamilyMember} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />Add Member
                </Button>
              </div>

              <div className="space-y-3">
                {familyMembers.map((member, index) => (
                  <div key={member.id ?? `new-${index}`} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium">Member {index + 1}</span>
                      <div className="flex gap-2">
                        <Button onClick={() => persistFamilyMember(index)} size="sm" variant="outline" className="gap-1">
                          <Save className="h-3 w-3" />Save Member
                        </Button>
                        <Button onClick={() => requestRemoveFamilyMember(index)} size="sm" variant="ghost" className="touch-target-coarse shrink-0 text-destructive" aria-label={`Remove ${member.first_name || "family member"}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <div>
                        <Label>First Name</Label>
                        <Input value={member.first_name} onChange={(e) => updateFamilyMember(index, "first_name", e.target.value)} />
                      </div>
                      <div>
                        <Label>Date of Birth</Label>
                        <Input type="date" value={member.date_of_birth || ""} onChange={(e) => updateFamilyMember(index, "date_of_birth", e.target.value)} />
                      </div>
                      <div>
                        <Label>Age</Label>
                        <Input type="number" value={member.age} onChange={(e) => updateFamilyMember(index, "age", Number(e.target.value))} />
                      </div>
                      <div>
                        <Label>Person Cost ($)</Label>
                        <Input type="number" step="0.01" value={member.person_cost} onChange={(e) => updateFamilyMember(index, "person_cost", Number(e.target.value))} />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Checkbox
                          id={`baptized-${index}`}
                          checked={member.is_baptized}
                          onCheckedChange={(c) => updateFamilyMember(index, "is_baptized", !!c)}
                        />
                        <Label htmlFor={`baptized-${index}`} className="cursor-pointer">Baptized</Label>
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Checkbox
                          id={`adult-${index}`}
                          checked={!!member.is_adult_override}
                          onCheckedChange={(c) => updateFamilyMember(index, "is_adult_override", !!c)}
                        />
                        <Label htmlFor={`adult-${index}`} className="cursor-pointer">Treat as Adult</Label>
                      </div>
                    </div>
                  </div>
                ))}

                {familyMembers.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">No attendees added yet</p>
                    <Button onClick={addFamilyMember} variant="outline" size="sm" className="mt-2 bg-transparent">
                      Add First Member
                    </Button>
                  </div>
                )}
              </div>
        </EditSection>

        <EditSection
          id="tshirts"
          title="T-Shirt Orders"
          description={`Merchandise for this family. Running total: $${tshirtTotal.toFixed(2)}`}
          count={tshirtOrders.length}
        >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Manage t-shirt orders. Total: ${tshirtTotal.toFixed(2)}</p>
                <Button onClick={addTshirt} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />Add T-Shirt
                </Button>
              </div>
              <div className="space-y-2">
                {tshirtOrders.map((order, index) => (
                  <div key={order.id ?? `new-tshirt-${index}`} className="grid items-end gap-3 rounded-lg border p-3 md:grid-cols-6">
                    <div>
                      <Label>Size</Label>
                      <Select value={order.size} onValueChange={(v) => updateTshirt(index, "size", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TSHIRT_SIZES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Color</Label>
                      <Select value={order.color} onValueChange={(v) => updateTshirt(index, "color", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TSHIRT_COLORS.map((c) => (
                            <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input type="number" min={1} value={order.quantity} onChange={(e) => updateTshirt(index, "quantity", Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Price ($)</Label>
                      <Input type="number" step="0.01" value={order.price} onChange={(e) => updateTshirt(index, "price", Number(e.target.value))} />
                    </div>
                    <Button onClick={() => persistTshirt(index)} size="sm" variant="outline">
                      <Save className="mr-1 h-3 w-3" />Save
                    </Button>
                    <Button onClick={() => requestRemoveTshirt(index)} size="sm" variant="ghost" className="touch-target-coarse shrink-0 text-destructive" aria-label="Remove t-shirt order">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {tshirtOrders.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">No t-shirt orders yet</p>
                  </div>
                )}
              </div>
        </EditSection>

        <EditSection
          id="volunteers"
          title="Volunteer Signups"
          description="Roles this family volunteered for during registration."
          count={volunteers.length}
        >
              <p className="text-sm text-muted-foreground">Volunteer roles selected at registration.</p>
              {volunteers.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">No volunteer signups for this family.</p>
                </div>
              ) : (
                volunteers.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{v.volunteer_name || "Unnamed"}</p>
                      {v.volunteer_type && <p className="text-sm text-muted-foreground">{v.volunteer_type}</p>}
                      {v.notes && <p className="text-xs text-muted-foreground mt-1">{v.notes}</p>}
                    </div>
                    <Button onClick={() => requestRemoveVolunteer(v.id)} size="sm" variant="ghost" className="touch-target-coarse shrink-0 text-destructive" aria-label={`Remove volunteer signup for ${v.volunteer_name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
        </EditSection>

        <EditSection
          id="payment"
          title="Payment"
          description="Track registration fees, lodging, and whether this family has paid in full."
        >
              <div className="rounded-lg border p-4">
                <h4 className="mb-3 font-semibold">Payment Progress</h4>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Paid: ${paidAmount.toFixed(2)}</span>
                  <span>Total: ${totalCost.toFixed(2)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${paymentProgress}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {paymentProgress >= 100 ? "Fully paid" : `${paymentProgress.toFixed(0)}% paid`}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Payment Status</Label>
                  <Select
                    value={reg.full_payment_paid ? "full" : reg.registration_fee_paid ? "partial" : "unpaid"}
                    onValueChange={(val) => {
                      if (val === "full") {
                        updateRegField("full_payment_paid", true)
                        updateRegField("registration_fee_paid", true)
                      } else if (val === "partial") {
                        updateRegField("registration_fee_paid", true)
                        updateRegField("full_payment_paid", false)
                      } else {
                        updateRegField("registration_fee_paid", false)
                        updateRegField("full_payment_paid", false)
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partial">Reg Fee Paid (${regFee.toFixed(2)})</SelectItem>
                      <SelectItem value="full">Paid in Full (${totalCost.toFixed(2)})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Registration Fee Override ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={reg.registration_fee ?? 0}
                    onChange={(e) => updateRegField("registration_fee", Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <Label>Payment Notes & Transaction History</Label>
                <Textarea
                  placeholder="Add payment details, transaction IDs, check numbers, dates received, etc."
                  value={reg.payment_notes || ""}
                  onChange={(e) => updateRegField("payment_notes", e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="mb-3 font-semibold">Cost Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Registration Fee:</span><span className="font-medium">${regFee.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Lodging:</span><span className="font-medium">${lodgingTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">T-Shirts:</span><span className="font-medium">${tshirtTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Climbing Tower:</span><span className="font-medium">${climbingTotal.toFixed(2)}</span></div>
                  {scholarshipDonation > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Scholarship Donation:</span><span className="font-medium">${scholarshipDonation.toFixed(2)}</span></div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-base"><span className="font-semibold">Total Due:</span><span className="font-bold">${totalCost.toFixed(2)}</span></div>
                </div>
              </div>
        </EditSection>

        <EditSection
          id="checkin"
          title="Check-In"
          description="On-site arrival: QR code, room keys, and t-shirt pickup."
        >
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Check-In Status</h4>
                    {reg.checked_in ? (
                      <p className="text-sm text-muted-foreground">
                        Checked in at {reg.checked_in_at ? new Date(reg.checked_in_at).toLocaleString() : "—"}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not checked in yet</p>
                    )}
                  </div>
                  {reg.checked_in ? (
                    <Button onClick={requestUndoCheckIn} variant="outline" className="gap-2 bg-transparent">
                      <RotateCcw className="h-4 w-4" />Undo Check-In
                    </Button>
                  ) : (
                    <Button onClick={handleCheckIn} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />Check In Now
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-semibold flex items-center gap-2">
                  <QrCode className="h-4 w-4" />QR Code
                </h4>
                <p className="font-mono text-2xl tracking-widest">{reg.checkin_qr_code || "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground">10-digit code used at check-in</p>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-semibold">Room Keys</h4>
                <div>
                  <Label>Assigned Keys (comma-separated)</Label>
                  <Input
                    value={roomKeysInput}
                    onChange={(e) => setRoomKeysInput(e.target.value)}
                    placeholder="e.g. 101, 102"
                  />
                </div>
                {reg.room_keys && reg.room_keys.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {normalizeStringArray(reg.room_keys).map((k) => (
                      <Badge key={k} variant="secondary">Key {k}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox id="keys-returned" checked={!!reg.keys_returned} onCheckedChange={handleKeysReturned} />
                  <Label htmlFor="keys-returned" className="cursor-pointer">Keys returned</Label>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-semibold">T-Shirt Distribution</h4>
                <div className="flex items-center gap-2">
                  <Checkbox id="tshirts-distributed" checked={!!reg.tshirts_distributed} onCheckedChange={toggleTshirtDistributed} />
                  <Label htmlFor="tshirts-distributed" className="cursor-pointer">T-shirts distributed to family</Label>
                </div>
              </div>
        </EditSection>

        <EditSection
          id="health"
          title="Health Information"
          description="Conditions and medications reported at registration."
          count={healthInfo.length}
        >
              <p className="text-sm text-muted-foreground">Health information submitted for this family.</p>
              {healthInfo.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">No health info on file.</p>
                </div>
              ) : (
                healthInfo.map((h) => (
                  <div key={h.id} className="rounded-lg border p-3">
                    <p className="font-medium">{h.full_name}</p>
                    <p className="text-sm">{h.condition}</p>
                    {h.medication_on_hand && (
                      <Badge variant="secondary" className="mt-1">Has medication on hand</Badge>
                    )}
                  </div>
                ))
              )}
        </EditSection>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur sm:px-6">
        <div className="admin-container flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
            <Link href={backHref}>Back to list</Link>
          </Button>
          <Button onClick={saveRegistration} disabled={saving} className="min-h-11 w-full gap-2 sm:w-auto">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Contact & Payment"}
          </Button>
        </div>
      </div>

    {confirmCopy && (
      <AdminConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open && !confirmLoading) setConfirmAction(null)
        }}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.confirmLabel}
        loading={confirmLoading}
        onConfirm={handleConfirmAction}
      />
    )}
    </>
  )
}
