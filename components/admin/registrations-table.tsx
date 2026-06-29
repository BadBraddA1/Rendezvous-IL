"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Search, Edit, Trash2, Mail, FileText } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BulkEmailModal } from "./bulk-email-modal"
import { AdminConfirmDialog } from "./admin-confirm-dialog"
import { AdminListSkeleton, AdminRetryButton } from "./admin-panel-states"
import { useToast } from "@/hooks/use-toast"
import { parseLegacyRegistrationId } from "@/lib/admin-registration-queries"
import {
  DEFAULT_REGISTRATION_EVENT_YEAR,
  REGISTRATION_EVENT_YEARS,
  REGISTRATION_YEAR_STORAGE_KEY,
  parseRegistrationEventYear,
  registrationYearLabel,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"

type AdminRegistrationRow = {
  id: string
  family_last_name: string
  email: string
  attendee_count: number
  lodging_type: string
  total_cost: number
  registration_fee_paid?: boolean
  full_payment_paid?: boolean
  created_at: string
  source?: "legacy" | "v2"
  event_year?: RegistrationEventYear
}

function readStoredEventYear(): RegistrationEventYear {
  if (typeof window === "undefined") return DEFAULT_REGISTRATION_EVENT_YEAR
  return parseRegistrationEventYear(window.sessionStorage.getItem(REGISTRATION_YEAR_STORAGE_KEY))
}

export function RegistrationsTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [eventYear, setEventYear] = useState<RegistrationEventYear>(DEFAULT_REGISTRATION_EVENT_YEAR)
  const [registrations, setRegistrations] = useState<AdminRegistrationRow[]>([])
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [lodgingFilter, setLodgingFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [deletePending, setDeletePending] = useState<AdminRegistrationRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const yearFromUrl = searchParams.get("year")
    if (yearFromUrl) {
      setEventYear(parseRegistrationEventYear(yearFromUrl))
      return
    }
    setEventYear(readStoredEventYear())
  }, [searchParams])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem(REGISTRATION_YEAR_STORAGE_KEY, String(eventYear))
  }, [eventYear])

  const handleYearChange = (value: string) => {
    const year = parseRegistrationEventYear(value)
    setEventYear(year)
    const params = new URLSearchParams(searchParams.toString())
    params.set("year", String(year))
    router.replace(`/admin/registrations?${params.toString()}`)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const fetchRegistrations = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams()
      params.set("year", String(eventYear))
      if (search) params.append("search", search)
      if (lodgingFilter !== "all") params.append("lodging", lodgingFilter)

      const res = await fetch(`/api/admin/registrations?${params}`)
      if (!res.ok) {
        throw new Error(`Could not load registrations (${res.status})`)
      }
      const data = await res.json()
      const rows = Array.isArray(data) ? data : data.registrations
      if (Array.isArray(rows)) {
        setRegistrations(rows)
      } else {
        throw new Error("Unexpected response from registrations API")
      }
    } catch (error) {
      console.error("[v0] Error fetching registrations:", error)
      setRegistrations([])
      setFetchError(error instanceof Error ? error.message : "Could not load registrations")
    } finally {
      setLoading(false)
    }
  }, [eventYear, lodgingFilter, search])

  useEffect(() => {
    void fetchRegistrations()
  }, [fetchRegistrations])

  useEffect(() => {
    setSelectedRows(new Set())
  }, [eventYear])

  const handleExport = async () => {
    const res = await fetch(`/api/admin/registrations/export?year=${eventYear}`)
    if (!res.ok) {
      toast({ title: "Export failed", description: "Could not download CSV.", variant: "destructive" })
      return
    }
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `registrations-${eventYear}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const handleExportBadges = async () => {
    const res = await fetch("/api/admin/registrations/export-badges")
    if (!res.ok) {
      toast({ title: "Export failed", description: "Could not download badge CSV.", variant: "destructive" })
      return
    }
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

  const handleEditUnavailable = (registration: AdminRegistrationRow) => {
    toast({
      title: "Family registration",
      description: `${registrationYearLabel(eventYear)} family-account registrations are view-only here for now.`,
    })
  }

  const getEditHref = (registration: AdminRegistrationRow) => {
    const legacyId = parseLegacyRegistrationId(registration.id)
    if (!legacyId) return null
    return `/admin/registrations/${legacyId}?year=${eventYear}`
  }

  const performDelete = async () => {
    if (!deletePending) return
    if (deletePending.source === "v2") {
      toast({
        title: "Cannot delete here",
        description: "Family-based registrations must be managed from the family registration flow.",
        variant: "destructive",
      })
      setDeletePending(null)
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/registrations/${deletePending.id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete")

      toast({
        title: "Registration deleted",
        description: `${deletePending.family_last_name} family has been permanently removed.`,
      })

      setDeletePending(null)
      void fetchRegistrations()
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete registration.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
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

  const getPaymentStatus = (reg: AdminRegistrationRow) => {
    if (reg.full_payment_paid) return { label: "Paid in Full", variant: "default" as const }
    if (reg.registration_fee_paid) return { label: "Reg Fee Paid", variant: "secondary" as const }
    return { label: "Unpaid", variant: "outline" as const }
  }

  return (
    <>
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">{registrationYearLabel(eventYear)} registrations</p>
              <p className="text-xs text-muted-foreground">
                {eventYear === 2027
                  ? "Current year. Legacy form submissions and family account registrations are kept separate."
                  : "Archived event data from the 2026 registration form."}
              </p>
            </div>
            <Select value={String(eventYear)} onValueChange={handleYearChange}>
              <SelectTrigger className="w-full min-h-11 sm:w-[220px]">
                <SelectValue placeholder="Event year" />
              </SelectTrigger>
              <SelectContent>
                {REGISTRATION_EVENT_YEARS.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {registrationYearLabel(year)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="admin-toolbar mb-6">
            <div className="admin-toolbar-primary relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search families..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="min-h-11 pl-9"
                aria-label="Search registrations by family name or email"
              />
            </div>

            <Select value={lodgingFilter} onValueChange={setLodgingFilter}>
              <SelectTrigger className="admin-toolbar-action w-full min-h-11 sm:w-[200px]">
                <SelectValue placeholder="Filter by lodging" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lodging Types</SelectItem>
                <SelectItem value="motel">Motel</SelectItem>
                <SelectItem value="rv">RV</SelectItem>
                <SelectItem value="tent">Tent</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleExport} className="admin-toolbar-action gap-2">
              <Download className="h-4 w-4" aria-hidden="true" />
              Export CSV
            </Button>

            <Button onClick={handleExportBadges} variant="outline" className="admin-toolbar-action gap-2 bg-transparent">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Name Badges
            </Button>

            <Button onClick={handleBulkEmail} variant="outline" className="admin-toolbar-action gap-2 bg-transparent">
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email All
            </Button>
          </div>

          {fetchError && !loading ? (
            <div className="callout-destructive rounded-lg border p-4">
              <p className="text-sm">{fetchError}</p>
              <AdminRetryButton onRetry={() => void fetchRegistrations()} label="Reload registrations" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === registrations.length && registrations.length > 0}
                        onChange={toggleAllRows}
                        className="rounded border-input"
                        aria-label="Select all registrations"
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
                      <TableCell colSpan={9}>
                        <AdminListSkeleton rows={5} label="Loading registrations" />
                      </TableCell>
                    </TableRow>
                  ) : registrations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        {search
                          ? `No ${eventYear} registrations match your search.`
                          : `No ${eventYear} registrations found.`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    registrations.map((reg) => {
                      const paymentStatus = getPaymentStatus(reg)
                      const familyLabel = reg.family_last_name || "family"
                      const editHref = getEditHref(reg)
                      return (
                        <TableRow key={reg.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedRows.has(reg.id)}
                              onChange={() => toggleRowSelection(reg.id)}
                              className="rounded border-input"
                              aria-label={`Select ${familyLabel} family`}
                            />
                          </TableCell>
                          <TableCell className="min-w-0 max-w-[12rem] font-medium break-words">
                            <div className="flex flex-wrap items-center gap-2">
                              {editHref ? (
                                <Link href={editHref} className="hover:text-primary hover:underline">
                                  {reg.family_last_name}
                                </Link>
                              ) : (
                                <span>{reg.family_last_name}</span>
                              )}
                              {reg.source === "v2" && (
                                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                  Family
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-0 max-w-[16rem] break-all">{reg.email}</TableCell>
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
                              {editHref ? (
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="icon"
                                  className="touch-target shrink-0"
                                >
                                  <Link href={editHref} aria-label={`Edit ${familyLabel} registration`}>
                                    <Edit className="h-4 w-4" aria-hidden="true" />
                                  </Link>
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="touch-target shrink-0"
                                  onClick={() => handleEditUnavailable(reg)}
                                  aria-label={`Edit ${familyLabel} registration`}
                                >
                                  <Edit className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="touch-target shrink-0 text-destructive hover:text-destructive"
                                onClick={() => setDeletePending(reg)}
                                aria-label={`Delete ${familyLabel} registration`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
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
          )}
        </CardContent>
      </Card>

      <AdminConfirmDialog
        open={deletePending !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeletePending(null)
        }}
        title="Delete registration?"
        description={
          deletePending
            ? `Permanently remove the ${deletePending.family_last_name} family registration? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete registration"
        loading={deleting}
        onConfirm={performDelete}
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
