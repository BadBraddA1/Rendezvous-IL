"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Search, Edit, Trash2, Mail, FileText } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RegistrationEditModal } from "./registration-edit-modal"
import { BulkEmailModal } from "./bulk-email-modal"
import { useToast } from "@/hooks/use-toast"

export function RegistrationsTable() {
  const [registrations, setRegistrations] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [lodgingFilter, setLodgingFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [selectedRegistration, setSelectedRegistration] = useState<any | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchRegistrations()
  }, [search, lodgingFilter])

  const fetchRegistrations = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (lodgingFilter !== "all") params.append("lodging", lodgingFilter)

      const res = await fetch(`/api/admin/registrations?${params}`)
      if (!res.ok) {
        console.error("[v0] Failed to fetch registrations:", res.status)
        setRegistrations([])
        return
      }
      const data = await res.json()
      // Defensive: ensure we always have an array
      if (Array.isArray(data)) {
        setRegistrations(data)
      } else {
        console.error("[v0] Registrations response not an array:", data)
        setRegistrations([])
      }
    } catch (error) {
      console.error("[v0] Error fetching registrations:", error)
      setRegistrations([])
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    const res = await fetch("/api/admin/registrations/export")
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `registrations-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const handleExportBadges = async () => {
    const res = await fetch("/api/admin/registrations/export-badges")
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `name-badges-${new Date().toISOString().split("T")[0]}.csv`
    a.click()

    toast({
      title: "Badge data exported",
      description: "Name badge CSV has been downloaded.",
    })
  }

  const handleBulkEmail = () => {
    setEmailModalOpen(true)
  }

  const handleEditClick = (registration: any) => {
    setSelectedRegistration(registration)
    setEditModalOpen(true)
  }

  const handleSaveRegistration = async (updates: any) => {
    try {
      const res = await fetch(`/api/admin/registrations/${selectedRegistration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (!res.ok) throw new Error("Failed to update")

      toast({
        title: "Registration updated",
        description: "Changes have been saved successfully.",
      })

      fetchRegistrations()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update registration.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (registrationId: string) => {
    if (!confirm("Are you sure you want to delete this registration? This action cannot be undone.")) {
      return
    }

    try {
      const res = await fetch(`/api/admin/registrations/${registrationId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete")

      toast({
        title: "Registration deleted",
        description: "The registration has been permanently removed.",
      })

      fetchRegistrations()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete registration.",
        variant: "destructive",
      })
    }
  }

  const toggleRowSelection = (id: string) => {
    const newSelection = new Set(selectedRows)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedRows(newSelection)
  }

  const toggleAllRows = () => {
    if (selectedRows.size === registrations.length && registrations.length > 0) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(registrations.map((r) => r.id)))
    }
  }

  const getPaymentStatus = (reg: any) => {
    if (reg.full_payment_paid) return { label: "Paid in Full", variant: "default" as const }
    if (reg.registration_fee_paid) return { label: "Reg Fee Paid", variant: "secondary" as const }
    return { label: "Unpaid", variant: "outline" as const }
  }

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search families..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={lodgingFilter} onValueChange={setLodgingFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by lodging" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lodging Types</SelectItem>
                <SelectItem value="motel">Motel</SelectItem>
                <SelectItem value="rv">RV</SelectItem>
                <SelectItem value="tent">Tent</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>

            <Button onClick={handleExportBadges} variant="outline" className="gap-2 bg-transparent">
              <FileText className="h-4 w-4" />
              Name Badges
            </Button>

            <Button onClick={handleBulkEmail} variant="outline" className="gap-2 bg-transparent">
              <Mail className="h-4 w-4" />
              Email All
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === registrations.length && registrations.length > 0}
                      onChange={toggleAllRows}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>Family Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Attendees</TableHead>
                  <TableHead>Lodging</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : registrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No registrations found
                    </TableCell>
                  </TableRow>
                ) : (
                  registrations.map((reg) => {
                    const paymentStatus = getPaymentStatus(reg)
                    return (
                      <TableRow key={reg.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedRows.has(reg.id)}
                            onChange={() => toggleRowSelection(reg.id)}
                            className="rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{reg.family_last_name}</TableCell>
                        <TableCell>{reg.email}</TableCell>
                        <TableCell>{reg.attendee_count}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{reg.lodging_type}</Badge>
                        </TableCell>
                        <TableCell>${reg.total_cost}</TableCell>
                        <TableCell>
                          <Badge variant={paymentStatus.variant}>{paymentStatus.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(reg.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditClick(reg)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(reg.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RegistrationEditModal
        registration={selectedRegistration}
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveRegistration}
      />

      <BulkEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        registrations={registrations}
        selectedIds={Array.from(selectedRows)}
      />
    </>
  )
}
