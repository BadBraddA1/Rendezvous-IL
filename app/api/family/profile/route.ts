import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { authUserContext } from "@/lib/clerk-auth"
import {
  getFamilyMembersV2,
  getFamilyRoleForUser,
  getRegistrationBirthdayHints,
  resolveFamilyForUser,
} from "@/lib/family-auth"
import { getFamilyDirectorySettings } from "@/lib/family-directory"
import {
  listFamilyAccountMembers,
  listFamilyLoginInvites,
} from "@/lib/family-membership"
import { formatPhoneForStorage } from "@/lib/phone-format"

/** Fields that still require admin approval. */
const APPROVAL_PROFILE_FIELDS = [
  "family_last_name",
  "address",
  "city",
  "state",
  "zip",
  "home_congregation",
] as const

/** Contact fields apply immediately (no pending queue). */
const DIRECT_PROFILE_FIELDS = ["email", "husband_phone", "wife_phone"] as const

function parseMemberData(value: unknown) {
  if (!value) return null
  if (typeof value === "object") return value
  if (typeof value === "string") {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return null
}

function normalizeProfileUpdates(updates: Record<string, unknown>) {
  const normalized = { ...updates }
  if (normalized.street !== undefined && normalized.address === undefined) {
    normalized.address = normalized.street
  }
  delete normalized.street
  for (const field of ["husband_phone", "wife_phone"] as const) {
    if (normalized[field] !== undefined) {
      normalized[field] = formatPhoneForStorage(String(normalized[field] ?? "")) ?? ""
    }
  }
  if (normalized.email !== undefined) {
    normalized.email = String(normalized.email ?? "")
      .trim()
      .toLowerCase()
  }
  return normalized
}

async function applyDirectProfileFields(
  familyId: number,
  updates: Record<string, unknown>,
  current: Record<string, unknown>,
): Promise<string[]> {
  const applied: string[] = []

  if (updates.email !== undefined) {
    const next = String(updates.email ?? "")
    const prev = String(current.email ?? "")
    if (next !== prev) {
      await sql`UPDATE families SET email = ${next || null}, updated_at = CURRENT_TIMESTAMP WHERE id = ${familyId}`
      applied.push("email")
    }
  }

  if (updates.husband_phone !== undefined) {
    const next = String(updates.husband_phone ?? "")
    const prev = String(current.husband_phone ?? "")
    if (next !== prev) {
      await sql`UPDATE families SET husband_phone = ${next || null}, updated_at = CURRENT_TIMESTAMP WHERE id = ${familyId}`
      applied.push("husband_phone")
    }
  }

  if (updates.wife_phone !== undefined) {
    const next = String(updates.wife_phone ?? "")
    const prev = String(current.wife_phone ?? "")
    if (next !== prev) {
      await sql`UPDATE families SET wife_phone = ${next || null}, updated_at = CURRENT_TIMESTAMP WHERE id = ${familyId}`
      applied.push("wife_phone")
    }
  }

  return applied
}

// GET - Fetch family profile for the current user
export async function GET(request: Request) {
  try {
    const ctx = await authUserContext(request)
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const family = await resolveFamilyForUser(ctx.userId, ctx.email)

    if (!family) {
      return NextResponse.json({ family: null, pendingChanges: [] })
    }

    const members = await getFamilyMembersV2(family.id, family.email)
    const registrationBirthdays = family.email
      ? await getRegistrationBirthdayHints(family.email)
      : []

    const pendingRows = await sql`
      SELECT * FROM pending_family_changes
      WHERE family_id = ${family.id}
        AND status = 'pending'
      ORDER BY submitted_at DESC
    `

    const pendingChanges = pendingRows.map((change) => ({
      ...change,
      member_data: parseMemberData(change.member_data),
    }))

    const directory = await getFamilyDirectorySettings(family.id)
    const accountRole = (await getFamilyRoleForUser(family.id, ctx.userId)) ?? "member"
    const accountMembers = await listFamilyAccountMembers(family.id)
    const loginInvites = await listFamilyLoginInvites(family.id)

    return NextResponse.json({
      family: { ...family, members, ...directory },
      pendingChanges,
      registrationBirthdays,
      accountRole,
      accountMembers,
      loginInvites,
    })
  } catch (error) {
    console.error("Error fetching family profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

// PUT - Apply contact fields immediately; queue other profile fields for approval
export async function PUT(request: Request) {
  try {
    const ctx = await authUserContext(request)
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updates = normalizeProfileUpdates(await request.json())
    const family = await resolveFamilyForUser(ctx.userId, ctx.email)

    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 })
    }

    const directApplied = await applyDirectProfileFields(
      family.id,
      updates,
      family as unknown as Record<string, unknown>,
    )

    const changes: {
      family_id: number
      clerk_user_id: string
      change_type: string
      field_name: string
      old_value: string
      new_value: string
    }[] = []

    for (const field of APPROVAL_PROFILE_FIELDS) {
      if (updates[field] === undefined) continue

      const oldValue = String(family[field as keyof typeof family] ?? "")
      const newValue = String(updates[field] ?? "")

      if (newValue !== oldValue) {
        changes.push({
          family_id: family.id,
          clerk_user_id: ctx.userId,
          change_type: "update_field",
          field_name: field,
          old_value: oldValue,
          new_value: newValue,
        })
      }
    }

    for (const change of changes) {
      await sql`
        INSERT INTO pending_family_changes 
          (family_id, clerk_user_id, change_type, field_name, old_value, new_value)
        VALUES 
          (${change.family_id}, ${change.clerk_user_id}, ${change.change_type}, 
           ${change.field_name}, ${change.old_value}, ${change.new_value})
      `
    }

    const total = directApplied.length + changes.length
    let message = "No changes detected"
    if (directApplied.length > 0 && changes.length > 0) {
      message = `Saved ${directApplied.length} contact change(s); ${changes.length} other change(s) submitted for approval`
    } else if (directApplied.length > 0) {
      message = `Saved ${directApplied.length} contact change(s)`
    } else if (changes.length > 0) {
      message = "Changes submitted for approval"
    }

    return NextResponse.json({
      success: true,
      message,
      changesCount: total,
      directApplied,
      pendingCount: changes.length,
      // Keep callers that only check email/phone from treating them as pending.
      skippedDirectFields: [...DIRECT_PROFILE_FIELDS],
    })
  } catch (error) {
    console.error("Error submitting profile changes:", error)
    return NextResponse.json({ error: "Failed to submit changes" }, { status: 500 })
  }
}
