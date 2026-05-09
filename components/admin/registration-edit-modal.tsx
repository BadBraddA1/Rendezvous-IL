"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Save, QrCode, CheckCircle2, RotateCcw, Shirt, HandHelping, Heart } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

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

type Props = {
  registration: Registration | null
  open: boolean
  onClose: () => void
  onSave?: (updates: Partial<Registration>) => Promise<void>
}

const TSHIRT_SIZES = ["YS", "YM", "YL", "S", "M", "L", "XL", "2XL", "3XL"]
const TSHIRT_COLORS = ["sage", "navy", "white", "black", "gray"]

export function RegistrationEditModal({ registration, open, onClose, onSave }: Props) {
  const [reg, setReg] = useState<Registration | null>(null)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [tshirtOrders, setTshirtOrders] = useState<TshirtOrder[]>([])
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [healthInfo, setHealthInfo] = useState<HealthInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("contact")
  const [roomKeysInput, setRoomKeysInput] = useState("")
  const { toast } = useToast()

  const loadFullRegistration = useCallback(
    async (regId: string | number) => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/registrations/${regId}/full`)
        if (!res.ok) throw new Error("Failed to load registration")
        const data = await res.json()
        setReg(data.registration)
        setFamilyMembers(data.family_members || [])
        setTshirtOrders(data.tshirt_orders || [])
        setVolunteers(data.volunteers || [])
        setHealthInfo(data.health_info || [])
        setRoomKeysInput(((data.registration?.room_keys as string[]) || []).join(", "))
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
    if (registration && open) {
      setActiveTab("contact")
      void loadFullRegistration(registration.id)
    }
  }, [registration, open, loadFullRegistration])

  if (!registration) return null

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
      if (onSave) await onSave(payload as Partial<Registration>)
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
    if (!confirm(`Remove ${member.first_name || "this member"}?`)) return
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
    if (!confirm("Remove this t-shirt order?")) return
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

  // ---------- VOLUNTEERS ----------
  const removeVolunteer = async (id: number) => {
    if (!reg || !confirm("Remove this volunteer signup?")) return
    try {
      const res = await fetch(`/api/admin/registrations/${reg.id}/volunteers/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      setVolunteers((prev) => prev.filter((v) => v.id !== id))
    } catch {
      toast({ title: "Error", description: "Could not remove volunteer", variant: "destructive" })
    }
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
    if (!reg || !confirm("Undo check-in for this family?")) return
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Edit Registration - {reg?.family_last_name || registration.family_last_name} Family</span>
            {reg?.checked_in && (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Checked In
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Manage attendees, t-shirts, volunteers, payment, and check-in for this family.
          </DialogDescription>
        </DialogHeader>

        {loading || !reg ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading registration details...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="attendees">Attendees ({familyMembers.length})</TabsTrigger>
              <TabsTrigger value="tshirts">
                <Shirt className="mr-1 h-3 w-3" />T-Shirts ({tshirtOrders.length})
              </TabsTrigger>
              <TabsTrigger value="volunteers">
                <HandHelping className="mr-1 h-3 w-3" />Volunteers ({volunteers.length})
              </TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
              <TabsTrigger value="checkin">
                <QrCode className="mr-1 h-3 w-3" />Check-In
              </TabsTrigger>
              <TabsTrigger value="health">
                <Heart className="mr-1 h-3 w-3" />Health
              </TabsTrigger>
            </TabsList>

            {/* CONTACT */}
            <TabsContent value="contact" className="space-y-4">
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
            </TabsContent>

            {/* ATTENDEES */}
            <TabsContent value="attendees" className="space-y-4">
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
                        <Button onClick={() => removeFamilyMember(index)} size="sm" variant="ghost" className="text-destructive">
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
            </TabsContent>

            {/* T-SHIRTS */}
            <TabsContent value="tshirts" className="space-y-4">
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
                    <Button onClick={() => removeTshirt(index)} size="sm" variant="ghost" className="text-destructive">
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
            </TabsContent>

            {/* VOLUNTEERS */}
            <TabsContent value="volunteers" className="space-y-3">
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
                    <Button onClick={() => removeVolunteer(v.id)} size="sm" variant="ghost" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>

            {/* PAYMENT */}
            <TabsContent value="payment" className="space-y-6">
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
            </TabsContent>

            {/* CHECK-IN */}
            <TabsContent value="checkin" className="space-y-4">
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
                    <Button onClick={handleUndoCheckIn} variant="outline" className="gap-2 bg-transparent">
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
                {(reg.room_keys && reg.room_keys.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {reg.room_keys.map((k) => (
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
            </TabsContent>

            {/* HEALTH */}
            <TabsContent value="health" className="space-y-3">
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
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving || loading}>
            Close
          </Button>
          <Button onClick={saveRegistration} disabled={saving || loading} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Contact & Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
