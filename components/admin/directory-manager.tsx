"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  Camera,
  ExternalLink,
  EyeOff,
  ListChecks,
  Loader2,
  Pencil,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react"
import type { RegistrationEventYear } from "@/lib/registration-event-years"
import type { AdminDirectoryFamily, AdminDirectoryMember } from "@/lib/admin-directory"

type Props = {
  canManage: boolean
  eventYear: RegistrationEventYear
}

type FamilyForm = {
  family_last_name: string
  husband_first_name: string
  wife_first_name: string
  home_congregation: string
  address: string
  city: string
  state: string
  zip: string
  directory_blurb: string
  directory_opt_in: boolean
}

type MemberForm = {
  first_name: string
  last_name: string
  age: string
  parent_role: "father" | "mother" | "none"
  email: string
  phone: string
  share_contact_directory: boolean
}

function familyToForm(family: AdminDirectoryFamily): FamilyForm {
  return {
    family_last_name: family.family_last_name,
    husband_first_name: family.husband_first_name ?? "",
    wife_first_name: family.wife_first_name ?? "",
    home_congregation: family.home_congregation ?? "",
    address: family.address ?? "",
    city: family.city ?? "",
    state: family.state ?? "",
    zip: family.zip ?? "",
    directory_blurb: family.directory_blurb ?? "",
    directory_opt_in: family.directory_opt_in,
  }
}

function memberToForm(member: AdminDirectoryMember): MemberForm {
  return {
    first_name: member.first_name,
    last_name: member.last_name,
    age: member.age != null ? String(member.age) : "",
    parent_role: member.parent_role ?? "none",
    email: member.email ?? "",
    phone: member.phone ?? "",
    share_contact_directory: member.share_contact_directory,
  }
}

function familyFormToPayload(form: FamilyForm): Record<string, unknown> {
  return {
    family_last_name: form.family_last_name,
    husband_first_name: form.husband_first_name,
    wife_first_name: form.wife_first_name,
    home_congregation: form.home_congregation,
    address: form.address,
    city: form.city,
    state: form.state,
    zip: form.zip,
    directory_blurb: form.directory_blurb,
    directory_opt_in: form.directory_opt_in,
  }
}

function memberFormToPayload(form: MemberForm): Record<string, unknown> {
  return {
    first_name: form.first_name,
    last_name: form.last_name,
    age: form.age === "" ? null : Number(form.age),
    parent_role: form.parent_role === "none" ? null : form.parent_role,
    email: form.email,
    phone: form.phone,
    share_contact_directory: form.share_contact_directory,
  }
}

/** Fields in `draft` that differ from `original` (shallow compare on form values). */
function diffForm<T extends Record<string, unknown>>(original: T, draft: T): Partial<T> {
  const changed: Partial<T> = {}
  for (const key of Object.keys(draft) as (keyof T)[]) {
    if (draft[key] !== original[key]) changed[key] = draft[key]
  }
  return changed
}

export function DirectoryManager({ canManage, eventYear }: Props) {
  const [families, setFamilies] = useState<AdminDirectoryFamily[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  // Single-card edit state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FamilyForm | null>(null)
  const [memberEditId, setMemberEditId] = useState<number | null>(null)
  const [memberForm, setMemberForm] = useState<MemberForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [accountBusyId, setAccountBusyId] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoBusy, setPhotoBusy] = useState(false)

  // Bulk edit state: drafts for every family/member, saved in one request.
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkFamilies, setBulkFamilies] = useState<Record<number, FamilyForm>>({})
  const [bulkMembers, setBulkMembers] = useState<Record<number, MemberForm>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/directory/families?year=${eventYear}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load families")
      setFamilies(data.families as AdminDirectoryFamily[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load families")
    } finally {
      setLoading(false)
    }
  }, [eventYear])

  useEffect(() => {
    setEditingId(null)
    setMemberEditId(null)
    setBulkMode(false)
    void load()
  }, [load])

  // Original (server) forms, for computing what changed in bulk mode.
  const originals = useMemo(() => {
    const familyForms: Record<number, FamilyForm> = {}
    const memberForms: Record<number, MemberForm> = {}
    for (const family of families) {
      familyForms[family.id] = familyToForm(family)
      for (const member of family.members) {
        memberForms[member.id] = memberToForm(member)
      }
    }
    return { familyForms, memberForms }
  }, [families])

  const bulkChanges = useMemo(() => {
    if (!bulkMode) return { familyIds: [] as number[], memberIds: [] as number[] }
    const familyIds = Object.keys(bulkFamilies)
      .map(Number)
      .filter((id) => {
        const original = originals.familyForms[id]
        return original && Object.keys(diffForm(original, bulkFamilies[id])).length > 0
      })
    const memberIds = Object.keys(bulkMembers)
      .map(Number)
      .filter((id) => {
        const original = originals.memberForms[id]
        return original && Object.keys(diffForm(original, bulkMembers[id])).length > 0
      })
    return { familyIds, memberIds }
  }, [bulkMode, bulkFamilies, bulkMembers, originals])

  const bulkDirtyCount = bulkChanges.familyIds.length + bulkChanges.memberIds.length

  const enterBulkMode = () => {
    const familyDrafts: Record<number, FamilyForm> = {}
    const memberDrafts: Record<number, MemberForm> = {}
    for (const family of families) {
      familyDrafts[family.id] = familyToForm(family)
      for (const member of family.members) {
        memberDrafts[member.id] = memberToForm(member)
      }
    }
    setBulkFamilies(familyDrafts)
    setBulkMembers(memberDrafts)
    setBulkMode(true)
    setEditingId(null)
    setForm(null)
    setMemberEditId(null)
    setMemberForm(null)
    setError(null)
    setNotice(null)
  }

  const exitBulkMode = () => {
    setBulkMode(false)
    setBulkFamilies({})
    setBulkMembers({})
  }

  const saveAllBulk = async () => {
    if (bulkDirtyCount === 0) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const familiesPayload = bulkChanges.familyIds.map((id) => ({
        id,
        ...diffForm(originals.familyForms[id], bulkFamilies[id]) as Partial<FamilyForm>,
      }))
      const membersPayload = bulkChanges.memberIds.map((id) => ({
        id,
        ...diffForm(originals.memberForms[id], bulkMembers[id]) as Partial<MemberForm>,
      }))

      // Convert form values to API values for only the changed fields.
      const familiesBody = familiesPayload.map(({ id, ...changed }) => {
        const full = familyFormToPayload(bulkFamilies[id])
        const body: Record<string, unknown> = { id }
        for (const key of Object.keys(changed)) body[key] = full[key]
        return body
      })
      const membersBody = membersPayload.map(({ id, ...changed }) => {
        const full = memberFormToPayload(bulkMembers[id])
        const body: Record<string, unknown> = { id }
        for (const key of Object.keys(changed)) body[key] = full[key]
        return body
      })

      const res = await fetch("/api/admin/directory/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ families: familiesBody, members: membersBody }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save changes")

      if (Array.isArray(data.failures) && data.failures.length > 0) {
        setError(`Saved with ${data.failures.length} problem(s): ${data.failures.join("; ")}`)
      } else {
        setNotice(
          `Saved ${data.familiesUpdated} family${data.familiesUpdated === 1 ? "" : "ies"} and ${data.membersUpdated} member${data.membersUpdated === 1 ? "" : "s"}.`,
        )
      }
      exitBulkMode()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  const updateBulkFamily = (id: number, updates: Partial<FamilyForm>) => {
    setBulkFamilies((prev) => ({ ...prev, [id]: { ...prev[id], ...updates } }))
  }
  const updateBulkMember = (id: number, updates: Partial<MemberForm>) => {
    setBulkMembers((prev) => ({ ...prev, [id]: { ...prev[id], ...updates } }))
  }

  const removeAccountMember = async (familyId: number, clerkUserId: string) => {
    setAccountBusyId(clerkUserId)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch(`/api/admin/families/${familyId}/account-members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerk_user_id: clerkUserId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to remove linked account")
      setNotice("Removed linked family account member.")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove linked account")
    } finally {
      setAccountBusyId(null)
    }
  }

  const startEdit = (family: AdminDirectoryFamily) => {
    setEditingId(family.id)
    setForm(familyToForm(family))
    setMemberEditId(null)
    setError(null)
    setNotice(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(null)
    setMemberEditId(null)
  }

  const saveFamily = async () => {
    if (editingId === null || !form) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/directory/families/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(familyFormToPayload(form)),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save family")
      cancelEdit()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save family")
    } finally {
      setSaving(false)
    }
  }

  const saveMember = async () => {
    if (memberEditId === null || !memberForm) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/directory/members/${memberEditId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberFormToPayload(memberForm)),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save member")
      setMemberEditId(null)
      setMemberForm(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save member")
    } finally {
      setSaving(false)
    }
  }

  const uploadPhoto = async (familyId: number, file: File) => {
    setPhotoBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.append("photo", file)
      const res = await fetch(`/api/admin/directory/families/${familyId}/photo`, {
        method: "POST",
        body,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to upload photo")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo")
    } finally {
      setPhotoBusy(false)
    }
  }

  const removePhoto = async (familyId: number) => {
    setPhotoBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/directory/families/${familyId}/photo`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to remove photo")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove photo")
    } finally {
      setPhotoBusy(false)
    }
  }

  const query = search.trim().toLowerCase()
  const filtered = query
    ? families.filter((family) =>
        [
          family.family_last_name,
          family.home_congregation ?? "",
          family.email ?? "",
          family.husband_first_name ?? "",
          family.wife_first_name ?? "",
          ...family.members.map((m) => `${m.first_name} ${m.last_name} ${m.email ?? ""}`),
          ...(family.account_members ?? []).map(
            (m) => `${m.email ?? ""} ${m.clerk_user_id} ${m.role}`,
          ),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : families

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading directory families…
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${bulkMode ? "pb-24" : ""}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search families, members, congregations…"
          className="sm:max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>
            {filtered.length} of {families.length} families
          </span>
          {canManage && !bulkMode && (
            <Button variant="default" size="sm" onClick={enterBulkMode}>
              <ListChecks className="mr-2 h-4 w-4" aria-hidden="true" />
              Bulk edit
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/directory" target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              View public directory
            </Link>
          </Button>
        </div>
      </div>

      {bulkMode && (
        <p className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm">
          <strong>Bulk edit is on.</strong> Every field below is editable — change as much as you
          want, then hit <strong>Save all</strong> in the bar at the bottom. Nothing is saved until
          then. (Photos still upload immediately.)
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm" role="status">
          {notice}
        </p>
      )}

      {filtered.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No families with a {eventYear} registration{query ? " match your search" : ""}.
        </p>
      )}

      {filtered.map((family) => {
        const isEditing = !bulkMode && editingId === family.id && form
        const bulkForm = bulkMode ? bulkFamilies[family.id] : null
        const familyDirty = bulkMode && bulkChanges.familyIds.includes(family.id)
        const activeForm = bulkMode ? bulkForm : isEditing ? form : null
        const setActiveForm = (updates: Partial<FamilyForm>) => {
          if (bulkMode) updateBulkFamily(family.id, updates)
          else if (form) setForm({ ...form, ...updates })
        }

        return (
          <Card key={family.id} className={familyDirty ? "border-primary/60" : undefined}>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {family.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={family.photo_url}
                        alt={`${family.family_last_name} family`}
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Users className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="break-words font-semibold">
                        {family.family_last_name} family
                        {familyDirty && (
                          <Badge className="ml-2 align-middle">Edited</Badge>
                        )}
                        {!family.directory_opt_in && (
                          <Badge variant="outline" className="ml-2 align-middle">
                            <EyeOff className="mr-1 h-3 w-3" aria-hidden="true" />
                            Hidden from directory
                          </Badge>
                        )}
                      </p>
                      {!activeForm && (
                        <>
                          <p className="break-words text-sm text-muted-foreground">
                            {[family.husband_first_name, family.wife_first_name]
                              .filter(Boolean)
                              .join(" & ") || "Parents not listed"}
                            {family.home_congregation ? ` • ${family.home_congregation}` : ""}
                          </p>
                          <p className="break-all text-sm text-muted-foreground">{family.email}</p>
                          {family.directory_blurb && (
                            <p className="mt-1 break-words text-sm italic text-muted-foreground">
                              &ldquo;{family.directory_blurb}&rdquo;
                            </p>
                          )}
                        </>
                      )}
                      {bulkMode && (
                        <p className="break-all text-sm text-muted-foreground">{family.email}</p>
                      )}
                    </div>
                  </div>
                  {canManage && !bulkMode && !isEditing && (
                    <Button variant="outline" size="sm" onClick={() => startEdit(family)}>
                      <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                      Edit
                    </Button>
                  )}
                </div>

                {activeForm && (
                  <div
                    className={`space-y-4 rounded-lg border p-4 ${
                      bulkMode ? "bg-background" : "border-dashed bg-muted/30"
                    }`}
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <Label htmlFor={`last-${family.id}`}>Family last name</Label>
                        <Input
                          id={`last-${family.id}`}
                          value={activeForm.family_last_name}
                          onChange={(e) => setActiveForm({ family_last_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`cong-${family.id}`}>Home congregation</Label>
                        <Input
                          id={`cong-${family.id}`}
                          value={activeForm.home_congregation}
                          onChange={(e) => setActiveForm({ home_congregation: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`hf-${family.id}`}>Husband first name</Label>
                        <Input
                          id={`hf-${family.id}`}
                          value={activeForm.husband_first_name}
                          onChange={(e) => setActiveForm({ husband_first_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`wf-${family.id}`}>Wife first name</Label>
                        <Input
                          id={`wf-${family.id}`}
                          value={activeForm.wife_first_name}
                          onChange={(e) => setActiveForm({ wife_first_name: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`addr-${family.id}`}>Street address</Label>
                        <Input
                          id={`addr-${family.id}`}
                          value={activeForm.address}
                          onChange={(e) => setActiveForm({ address: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`city-${family.id}`}>City</Label>
                        <Input
                          id={`city-${family.id}`}
                          value={activeForm.city}
                          onChange={(e) => setActiveForm({ city: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`state-${family.id}`}>State</Label>
                          <Input
                            id={`state-${family.id}`}
                            value={activeForm.state}
                            onChange={(e) => setActiveForm({ state: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`zip-${family.id}`}>Zip</Label>
                          <Input
                            id={`zip-${family.id}`}
                            value={activeForm.zip}
                            onChange={(e) => setActiveForm({ zip: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`blurb-${family.id}`}>Directory blurb (280 chars)</Label>
                        <Textarea
                          id={`blurb-${family.id}`}
                          value={activeForm.directory_blurb}
                          maxLength={280}
                          rows={2}
                          onChange={(e) => setActiveForm({ directory_blurb: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={activeForm.directory_opt_in}
                          onCheckedChange={(checked) =>
                            setActiveForm({ directory_opt_in: checked === true })
                          }
                        />
                        Listed in the public directory
                      </label>
                      {!bulkMode && (
                        <div className="flex items-center gap-2">
                          <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) void uploadPhoto(family.id, file)
                              e.target.value = ""
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={photoBusy}
                            onClick={() => photoInputRef.current?.click()}
                          >
                            <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
                            {photoBusy ? "Working…" : family.photo_url ? "Replace photo" : "Upload photo"}
                          </Button>
                          {family.photo_url && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={photoBusy}
                              onClick={() => void removePhoto(family.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                              Remove photo
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {!bulkMode && (
                      <div className="flex gap-2">
                        <Button onClick={() => void saveFamily()} disabled={saving}>
                          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                          Save family
                        </Button>
                        <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                          <X className="mr-2 h-4 w-4" aria-hidden="true" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Linked app accounts ({family.account_members?.length ?? 0})
                  </p>
                  {(family.account_members?.length ?? 0) === 0 ? (
                    <p className="mb-4 text-sm text-muted-foreground">
                      No Clerk accounts linked yet. Member emails on the registration can auto-join when they sign in.
                    </p>
                  ) : (
                    <div className="mb-4 space-y-2">
                      {family.account_members.map((account) => (
                        <div
                          key={account.clerk_user_id}
                          className="flex items-start justify-between gap-3 rounded-lg border p-3"
                        >
                          <div className="min-w-0">
                            <p className="break-all text-sm font-medium">
                              {account.email || account.clerk_user_id}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <Badge variant={account.role === "primary" ? "default" : "secondary"}>
                                {account.role}
                              </Badge>
                              <Badge variant="outline">{account.source.replace(/_/g, " ")}</Badge>
                            </div>
                          </div>
                          {canManage && account.role !== "primary" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={accountBusyId === account.clerk_user_id}
                              onClick={() => void removeAccountMember(family.id, account.clerk_user_id)}
                            >
                              {accountBusyId === account.clerk_user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              )}
                              <span className="sr-only">Remove linked account</span>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Members on the {eventYear} card ({family.members.length})
                  </p>
                  {family.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No registration members found for {eventYear}.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {family.members.map((member) => {
                        const isMemberEditing =
                          !bulkMode && memberEditId === member.id && memberForm
                        const bulkMemberForm = bulkMode ? bulkMembers[member.id] : null
                        const memberDirty = bulkMode && bulkChanges.memberIds.includes(member.id)
                        const activeMemberForm = bulkMode
                          ? bulkMemberForm
                          : isMemberEditing
                            ? memberForm
                            : null
                        const setActiveMemberForm = (updates: Partial<MemberForm>) => {
                          if (bulkMode) updateBulkMember(member.id, updates)
                          else if (memberForm) setMemberForm({ ...memberForm, ...updates })
                        }

                        return (
                          <div
                            key={member.id}
                            className={`rounded-lg border p-3 ${memberDirty ? "border-primary/60" : ""}`}
                          >
                            {!activeMemberForm && (
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 text-sm">
                                  <p className="break-words font-medium">
                                    {member.first_name} {member.last_name}
                                    {member.parent_role && (
                                      <Badge variant="secondary" className="ml-2 align-middle capitalize">
                                        {member.parent_role}
                                      </Badge>
                                    )}
                                  </p>
                                  <p className="text-muted-foreground">
                                    {member.age != null ? `Age ${member.age}` : "Age unknown"}
                                    {" • "}
                                    {member.share_contact_directory
                                      ? "Sharing contact info"
                                      : "Contact info hidden"}
                                  </p>
                                  {(member.email || member.phone) && (
                                    <p className="break-all text-muted-foreground">
                                      {[member.email, member.phone].filter(Boolean).join(" • ")}
                                    </p>
                                  )}
                                </div>
                                {canManage && !bulkMode && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setMemberEditId(member.id)
                                      setMemberForm(memberToForm(member))
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" aria-hidden="true" />
                                    <span className="sr-only">Edit member</span>
                                  </Button>
                                )}
                              </div>
                            )}

                            {activeMemberForm && (
                              <div className="space-y-3">
                                {memberDirty && <Badge>Edited</Badge>}
                                <div className="grid gap-3 md:grid-cols-3">
                                  <div>
                                    <Label htmlFor={`mfn-${member.id}`}>First name</Label>
                                    <Input
                                      id={`mfn-${member.id}`}
                                      value={activeMemberForm.first_name}
                                      onChange={(e) =>
                                        setActiveMemberForm({ first_name: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`mln-${member.id}`}>Last name</Label>
                                    <Input
                                      id={`mln-${member.id}`}
                                      value={activeMemberForm.last_name}
                                      onChange={(e) =>
                                        setActiveMemberForm({ last_name: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`mage-${member.id}`}>Age</Label>
                                    <Input
                                      id={`mage-${member.id}`}
                                      type="number"
                                      min="0"
                                      value={activeMemberForm.age}
                                      onChange={(e) =>
                                        setActiveMemberForm({ age: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`mrole-${member.id}`}>Role</Label>
                                    <Select
                                      value={activeMemberForm.parent_role}
                                      onValueChange={(value) =>
                                        setActiveMemberForm({
                                          parent_role: value as MemberForm["parent_role"],
                                        })
                                      }
                                    >
                                      <SelectTrigger id={`mrole-${member.id}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">Child / other</SelectItem>
                                        <SelectItem value="father">Father</SelectItem>
                                        <SelectItem value="mother">Mother</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`memail-${member.id}`}>Email</Label>
                                    <Input
                                      id={`memail-${member.id}`}
                                      type="email"
                                      value={activeMemberForm.email}
                                      onChange={(e) =>
                                        setActiveMemberForm({ email: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`mphone-${member.id}`}>Phone</Label>
                                    <Input
                                      id={`mphone-${member.id}`}
                                      type="tel"
                                      value={activeMemberForm.phone}
                                      onChange={(e) =>
                                        setActiveMemberForm({ phone: e.target.value })
                                      }
                                    />
                                  </div>
                                </div>
                                <label className="flex cursor-pointer items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={activeMemberForm.share_contact_directory}
                                    onCheckedChange={(checked) =>
                                      setActiveMemberForm({
                                        share_contact_directory: checked === true,
                                      })
                                    }
                                  />
                                  Show this member&apos;s email/phone in the public directory
                                </label>
                                {!bulkMode && (
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => void saveMember()} disabled={saving}>
                                      {saving && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                      )}
                                      Save member
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={saving}
                                      onClick={() => {
                                        setMemberEditId(null)
                                        setMemberForm(null)
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {bulkMode && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 p-3 shadow-lg backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm">
              {bulkDirtyCount === 0 ? (
                <span className="text-muted-foreground">
                  Bulk edit — no changes yet. Edit any field above.
                </span>
              ) : (
                <>
                  <strong>{bulkDirtyCount}</strong> unsaved change
                  {bulkDirtyCount === 1 ? "" : "s"} ({bulkChanges.familyIds.length} famil
                  {bulkChanges.familyIds.length === 1 ? "y" : "ies"},{" "}
                  {bulkChanges.memberIds.length} member
                  {bulkChanges.memberIds.length === 1 ? "" : "s"})
                </>
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exitBulkMode} disabled={saving}>
                <X className="mr-2 h-4 w-4" aria-hidden="true" />
                {bulkDirtyCount > 0 ? "Discard changes" : "Exit bulk edit"}
              </Button>
              <Button onClick={() => void saveAllBulk()} disabled={saving || bulkDirtyCount === 0}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Save all
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
