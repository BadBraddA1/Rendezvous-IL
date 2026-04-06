"use client"

import { useState, useEffect } from "react"
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
import { Plus, Trash2, Save } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

type Registration = {
  id: string
  family_last_name: string
  email: string
  husband_phone: string
  wife_phone: string
  address: string
  city: string
  state: string
  zip: string
  home_congregation: string
  lodging_type: string
  lodging_total: number
  tshirt_total: number
  climbing_tower_total: number
  registration_fee: number
  total_cost: number
  attendee_count: number
  registration_fee_paid: boolean
  full_payment_paid: boolean
  payment_notes: string
  created_at: string
  family_members: any[]
}

type FamilyMember = {
  id?: number
  first_name: string
  date_of_birth: string
  age: number
  is_baptized: boolean
  person_cost: number
}

type Props = {
  registration: Registration | null
  open: boolean
  onClose: () => void
  onSave: (updates: Partial<Registration>) => Promise<void>
}

export function RegistrationEditModal({ registration, open, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<Partial<Registration>>({})
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [paymentHistory, setPaymentHistory] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("contact")
  const { toast } = useToast()

  useEffect(() => {
    if (registration && open) {
      setLoading(true)
      setFormData({})
      setFamilyMembers([])
      setPaymentHistory("")
      setActiveTab("contact")
      loadFullRegistration(registration.id)
    }
  }, [registration, open])

  const loadFullRegistration = async (regId: string) => {
    try {
      console.log("[v0] Loading full registration:", regId)
      const res = await fetch(`/api/admin/registrations/${regId}/full`)

      if (!res.ok) {
        throw new Error("Failed to load registration")
      }

      const data = await res.json()
      console.log("[v0] Loaded registration data:", data)

      setFamilyMembers(data.family_members || [])
      setPaymentHistory(data.registration.payment_notes || "")
      setFormData({})
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
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      console.log("[v0] Saving registration with data:", {
        ...formData,
        family_members: familyMembers,
        payment_notes: paymentHistory,
      })

      await onSave({
        ...formData,
        family_members: familyMembers,
        payment_notes: paymentHistory,
      })

      toast({
        title: "Success",
        description: "Registration updated successfully",
      })

      onClose()
    } catch (error) {
      console.error("[v0] Failed to save:", error)
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!registration) return null

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addFamilyMember = () => {
    setFamilyMembers([
      ...familyMembers,
      {
        first_name: "",
        date_of_birth: "",
        age: 0,
        is_baptized: false,
        person_cost: 0,
      },
    ])
  }

  const updateFamilyMember = (index: number, field: keyof FamilyMember, value: any) => {
    const updated = [...familyMembers]
    updated[index] = { ...updated[index], [field]: value }

    if (field === "date_of_birth" && value) {
      const birthDate = new Date(value)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      updated[index].age = age
    }

    setFamilyMembers(updated)
  }

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index))
  }

  const currentData = { ...registration, ...formData }

  const paidAmount = currentData.full_payment_paid
    ? currentData.total_cost
    : currentData.registration_fee_paid
      ? currentData.registration_fee
      : 0
  const paymentProgress = (paidAmount / currentData.total_cost) * 100

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Registration - {registration.family_last_name} Family</DialogTitle>
          <DialogDescription>Update registration details, manage attendees, and track payments</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading registration details...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="contact">Contact Info</TabsTrigger>
              <TabsTrigger value="attendees">Attendees ({familyMembers.length})</TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="contact" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Family Last Name</Label>
                  <Input
                    value={currentData.family_last_name}
                    onChange={(e) => updateField("family_last_name", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={currentData.email} onChange={(e) => updateField("email", e.target.value)} />
                </div>
                <div>
                  <Label>Husband Phone</Label>
                  <Input
                    value={currentData.husband_phone}
                    onChange={(e) => updateField("husband_phone", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Wife Phone</Label>
                  <Input value={currentData.wife_phone} onChange={(e) => updateField("wife_phone", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Input value={currentData.address || ""} onChange={(e) => updateField("address", e.target.value)} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={currentData.city || ""} onChange={(e) => updateField("city", e.target.value)} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={currentData.state || ""} onChange={(e) => updateField("state", e.target.value)} />
                </div>
                <div>
                  <Label>Zip Code</Label>
                  <Input value={currentData.zip || ""} onChange={(e) => updateField("zip", e.target.value)} />
                </div>
                <div>
                  <Label>Home Congregation</Label>
                  <Input
                    value={currentData.home_congregation || ""}
                    onChange={(e) => updateField("home_congregation", e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="attendees" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Manage all family members attending the event</p>
                <Button onClick={addFamilyMember} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Member
                </Button>
              </div>

              <div className="space-y-3">
                {familyMembers.map((member, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-medium text-sm">Member {index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFamilyMember(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <div>
                        <Label>First Name</Label>
                        <Input
                          value={member.first_name}
                          onChange={(e) => updateFamilyMember(index, "first_name", e.target.value)}
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <Label>Date of Birth</Label>
                        <Input
                          type="date"
                          value={member.date_of_birth}
                          onChange={(e) => updateFamilyMember(index, "date_of_birth", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Age</Label>
                        <Input value={member.age} disabled className="bg-muted" />
                      </div>
                      <div>
                        <Label>Baptized</Label>
                        <Select
                          value={member.is_baptized ? "yes" : "no"}
                          onValueChange={(val) => updateFamilyMember(index, "is_baptized", val === "yes")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
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

            <TabsContent value="payment" className="space-y-6">
              <div className="rounded-lg border p-4">
                <h4 className="mb-3 font-semibold">Payment Progress</h4>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Paid: ${paidAmount.toFixed(2)}</span>
                  <span>Total: ${currentData.total_cost}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-green-500 transition-all"
                    style={{ width: `${paymentProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {paymentProgress === 100 ? "Fully paid" : `${paymentProgress.toFixed(0)}% paid`}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Payment Status</Label>
                  <Select
                    value={
                      currentData.full_payment_paid ? "full" : currentData.registration_fee_paid ? "partial" : "unpaid"
                    }
                    onValueChange={(val) => {
                      if (val === "full") {
                        updateField("full_payment_paid", true)
                        updateField("registration_fee_paid", true)
                      } else if (val === "partial") {
                        updateField("registration_fee_paid", true)
                        updateField("full_payment_paid", false)
                      } else {
                        updateField("registration_fee_paid", false)
                        updateField("full_payment_paid", false)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partial">Reg Fee Paid (${currentData.registration_fee})</SelectItem>
                      <SelectItem value="full">Paid in Full (${currentData.total_cost})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Payment Notes & Transaction History</Label>
                  <Textarea
                    placeholder="Add payment details, transaction IDs, check numbers, dates received, etc.
Example:
- 1/15/2026: Received $50 reg fee via check #1234
- 2/1/2026: Paid remaining balance via Venmo (@johndoe)"
                    value={paymentHistory}
                    onChange={(e) => setPaymentHistory(e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="mb-3 font-semibold">Cost Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Registration Fee:</span>
                    <span className="font-medium">${currentData.registration_fee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lodging:</span>
                    <span className="font-medium">${currentData.lodging_total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">T-Shirts:</span>
                    <span className="font-medium">${currentData.tshirt_total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Climbing Tower:</span>
                    <span className="font-medium">${currentData.climbing_tower_total}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-base">
                    <span className="font-semibold">Total Due:</span>
                    <span className="font-bold">${currentData.total_cost}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h4 className="mb-3 font-semibold">Family Information</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Family Name:</dt>
                      <dd className="font-medium">{currentData.family_last_name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Email:</dt>
                      <dd className="font-medium">{currentData.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Total Attendees:</dt>
                      <dd className="font-medium">{familyMembers.length} people</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Lodging Type:</dt>
                      <dd>
                        <Badge variant="secondary">{currentData.lodging_type}</Badge>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg border p-4">
                  <h4 className="mb-3 font-semibold">Payment Status</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Status:</dt>
                      <dd>
                        <Badge
                          variant={
                            currentData.full_payment_paid
                              ? "default"
                              : currentData.registration_fee_paid
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {currentData.full_payment_paid
                            ? "Paid in Full"
                            : currentData.registration_fee_paid
                              ? "Reg Fee Paid"
                              : "Unpaid"}
                        </Badge>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Amount Paid:</dt>
                      <dd className="font-medium">${paidAmount.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Balance Due:</dt>
                      <dd className="font-medium">${(currentData.total_cost - paidAmount).toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Total Cost:</dt>
                      <dd className="font-bold">${currentData.total_cost}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="mb-3 font-semibold">Registration Date</h4>
                <p className="text-sm text-muted-foreground">
                  Registered on {new Date(currentData.created_at).toLocaleString()}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving || loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save All Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
