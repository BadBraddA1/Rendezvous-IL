"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
  Loader2,
  Pencil,
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

export function DirectoryManager({ canManage, eventYear }: Props) {
  const [families, setFamilies] = useState<AdminDirectoryFamily[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FamilyForm | null>(null)
  const [memberEditId, setMemberEditId] = useState<number | null>(null)
  const [memberForm, setMemberForm] = useState<MemberForm | null>(null)
  const [saving, setSaving] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoBusy, setPhotoBusy] = useState(false)

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
    void load()
  }, [load])

  const startEdit = (family: AdminDirectoryFamily) => {
    setEditingId(family.id)
    setForm(familyToForm(family))
    setMemberEditId(null)
    setError(null)
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
        body: JSON.stringify({
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
        }),
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
        body: JSON.stringify({
          first_name: memberForm.first_name,
          last_name: memberForm.last_name,
          age: memberForm.age === "" ? null : Number(memberForm.age),
          parent_role: memberForm.parent_role === "none" ? null : memberForm.parent_role,
          email: memberForm.email,
          phone: memberForm.phone,
          share_contact_directory: memberForm.share_contact_directory,
        }),
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
          ...family.members.map((m) => `${m.first_name} ${m.last_name}`),
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search families, members, congregations…"
          className="sm:max-w-sm"
        />
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {filtered.length} of {families.length} families
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href="/directory" target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              View public directory
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {filtered.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No families with a {eventYear} registration{query ? " match your search" : ""}.
        </p>
      )}

      {filtered.map((family) => {
        const isEditing = editingId === family.id && form
        return (
          <Card key={family.id}>
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
                        {!family.directory_opt_in && (
                          <Badge variant="outline" className="ml-2 align-middle">
                            <EyeOff className="mr-1 h-3 w-3" aria-hidden="true" />
                            Hidden from directory
                          </Badge>
                        )}
                      </p>
                      <p className="break-words text-sm text-muted-foreground">
                        {[family.husband_first_name, family.wife_first_name]
                          .filter(Boolean)
                          .join(" & ") || "Parents not listed"}
                        {family.home_congregation ? ` • ${family.home_congregation}` : ""}
                      </p>
                      <p className="break-all text-sm text-muted-foreground">{family.email}</p>
                      {family.directory_blurb && !isEditing && (
                        <p className="mt-1 break-words text-sm italic text-muted-foreground">
                          &ldquo;{family.directory_blurb}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                  {canManage && !isEditing && (
                    <Button variant="outline" size="sm" onClick={() => startEdit(family)}>
                      <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                      Edit
                    </Button>
                  )}
                </div>

                {isEditing && form && (
                  <div className="space-y-4 rounded-lg border border-dashed bg-muted/30 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <Label htmlFor={`last-${family.id}`}>Family last name</Label>
                        <Input
                          id={`last-${family.id}`}
                          value={form.family_last_name}
                          onChange={(e) => setForm({ ...form, family_last_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`cong-${family.id}`}>Home congregation</Label>
                        <Input
                          id={`cong-${family.id}`}
                          value={form.home_congregation}
                          onChange={(e) => setForm({ ...form, home_congregation: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`hf-${family.id}`}>Husband first name</Label>
                        <Input
                          id={`hf-${family.id}`}
                          value={form.husband_first_name}
                          onChange={(e) => setForm({ ...form, husband_first_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`wf-${family.id}`}>Wife first name</Label>
                        <Input
                          id={`wf-${family.id}`}
                          value={form.wife_first_name}
                          onChange={(e) => setForm({ ...form, wife_first_name: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`addr-${family.id}`}>Street address</Label>
                        <Input
                          id={`addr-${family.id}`}
                          value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`city-${family.id}`}>City</Label>
                        <Input
                          id={`city-${family.id}`}
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`state-${family.id}`}>State</Label>
                          <Input
                            id={`state-${family.id}`}
                            value={form.state}
                            onChange={(e) => setForm({ ...form, state: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`zip-${family.id}`}>Zip</Label>
                          <Input
                            id={`zip-${family.id}`}
                            value={form.zip}
                            onChange={(e) => setForm({ ...form, zip: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`blurb-${family.id}`}>Directory blurb (280 chars)</Label>
                        <Textarea
                          id={`blurb-${family.id}`}
                          value={form.directory_blurb}
                          maxLength={280}
                          rows={2}
                          onChange={(e) => setForm({ ...form, directory_blurb: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.directory_opt_in}
                          onCheckedChange={(checked) =>
                            setForm({ ...form, directory_opt_in: checked === true })
                          }
                        />
                        Listed in the public directory
                      </label>
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
                    </div>

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
                  </div>
                )}

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
                        const isMemberEditing = memberEditId === member.id && memberForm
                        return (
                          <div key={member.id} className="rounded-lg border p-3">
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
                              {canManage && !isMemberEditing && (
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

                            {isMemberEditing && memberForm && (
                              <div className="mt-3 space-y-3 border-t pt-3">
                                <div className="grid gap-3 md:grid-cols-3">
                                  <div>
                                    <Label htmlFor={`mfn-${member.id}`}>First name</Label>
                                    <Input
                                      id={`mfn-${member.id}`}
                                      value={memberForm.first_name}
                                      onChange={(e) =>
                                        setMemberForm({ ...memberForm, first_name: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`mln-${member.id}`}>Last name</Label>
                                    <Input
                                      id={`mln-${member.id}`}
                                      value={memberForm.last_name}
                                      onChange={(e) =>
                                        setMemberForm({ ...memberForm, last_name: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`mage-${member.id}`}>Age</Label>
                                    <Input
                                      id={`mage-${member.id}`}
                                      type="number"
                                      min="0"
                                      value={memberForm.age}
                                      onChange={(e) =>
                                        setMemberForm({ ...memberForm, age: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`mrole-${member.id}`}>Role</Label>
                                    <Select
                                      value={memberForm.parent_role}
                                      onValueChange={(value) =>
                                        setMemberForm({
                                          ...memberForm,
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
                                      value={memberForm.email}
                                      onChange={(e) =>
                                        setMemberForm({ ...memberForm, email: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`mphone-${member.id}`}>Phone</Label>
                                    <Input
                                      id={`mphone-${member.id}`}
                                      type="tel"
                                      value={memberForm.phone}
                                      onChange={(e) =>
                                        setMemberForm({ ...memberForm, phone: e.target.value })
                                      }
                                    />
                                  </div>
                                </div>
                                <label className="flex cursor-pointer items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={memberForm.share_contact_directory}
                                    onCheckedChange={(checked) =>
                                      setMemberForm({
                                        ...memberForm,
                                        share_contact_directory: checked === true,
                                      })
                                    }
                                  />
                                  Show this member&apos;s email/phone in the public directory
                                </label>
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
    </div>
  )
}
