import { NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { sql } from "@/lib/db"
import {
  getFamilyMembersV2,
  getRegistrationBirthdayHints,
  resolveFamilyForUser,
} from "@/lib/family-auth"

const PROFILE_FIELDS = [
  "family_last_name",
  "email",
  "husband_phone",
  "wife_phone",
  "address",
  "city",
  "state",
  "zip",
  "home_congregation",
] as const

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
  return normalized
}

// GET - Fetch family profile for the current user
export async function GET() {
  try {
    const user = await currentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userEmail = user.emailAddresses[0]?.emailAddress
    const family = await resolveFamilyForUser(user.id, userEmail)

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

    return NextResponse.json({
      family: { ...family, members },
      pendingChanges,
      registrationBirthdays,
    })
  } catch (error) {
    console.error("Error fetching family profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

// PUT - Submit profile changes for approval
export async function PUT(request: Request) {
  try {
    const user = await currentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userEmail = user.emailAddresses[0]?.emailAddress
    const updates = normalizeProfileUpdates(await request.json())
    const family = await resolveFamilyForUser(user.id, userEmail)

    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 })
    }

    const changes: {
      family_id: number
      clerk_user_id: string
      change_type: string
      field_name: string
      old_value: string
      new_value: string
    }[] = []

    for (const field of PROFILE_FIELDS) {
      if (updates[field] === undefined) continue

      const oldValue = String(family[field as keyof typeof family] ?? "")
      const newValue = String(updates[field] ?? "")

      if (newValue !== oldValue) {
        changes.push({
          family_id: family.id,
          clerk_user_id: user.id,
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

    return NextResponse.json({
      success: true,
      message:
        changes.length > 0
          ? "Changes submitted for approval"
          : "No changes detected",
      changesCount: changes.length,
    })
  } catch (error) {
    console.error("Error submitting profile changes:", error)
    return NextResponse.json({ error: "Failed to submit changes" }, { status: 500 })
  }
}
