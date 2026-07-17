import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { authUserContext } from "@/lib/clerk-auth"
import { resolveFamilyForUser } from "@/lib/family-auth"
import { ensureFamilyMembershipSchema } from "@/lib/family-membership"
import {
  ageGroupForMemberType,
  deriveMemberClassification,
  type ProfileMemberType,
} from "@/lib/member-age"
import { formatPhoneForStorage } from "@/lib/phone-format"

function normalizeMemberPayload(memberData: Record<string, unknown>) {
  const normalized = { ...memberData }
  const dob =
    typeof normalized.date_of_birth === "string" ? normalized.date_of_birth : null

  const fromBirthday = deriveMemberClassification(dob)
  if (fromBirthday) {
    normalized.member_type = fromBirthday.member_type
    normalized.age_group = fromBirthday.age_group
    normalized.computed_age = fromBirthday.age
  } else {
    const memberType = normalized.member_type as ProfileMemberType | undefined
    if (memberType && memberType !== "child") {
      normalized.age_group = ageGroupForMemberType(memberType)
    } else if (memberType === "child" && !normalized.age_group) {
      normalized.age_group = ageGroupForMemberType("child")
    }
  }

  if (normalized.phone !== undefined) {
    normalized.phone = formatPhoneForStorage(String(normalized.phone ?? "")) ?? ""
  }

  if (normalized.email !== undefined) {
    const email = String(normalized.email ?? "").trim().toLowerCase()
    normalized.email = email || ""
  }

  return normalized
}

const CONTACT_ONLY_KEYS = new Set([
  "id",
  "email",
  "phone",
  "computed_age",
])

function hasNonContactMemberChanges(
  memberData: Record<string, unknown>,
  existing: Record<string, unknown> | null,
): boolean {
  if (!existing) return true

  const compareKeys = [
    "first_name",
    "last_name",
    "member_type",
    "age_group",
    "grade",
    "gender",
    "date_of_birth",
    "special_needs",
    "notes",
  ] as const

  for (const key of compareKeys) {
    if (memberData[key] === undefined) continue
    const next = String(memberData[key] ?? "")
    const prev = String(existing[key] ?? "")
    if (next !== prev) return true
  }

  // Any unexpected key beyond contact-only still goes through approval.
  for (const key of Object.keys(memberData)) {
    if (CONTACT_ONLY_KEYS.has(key)) continue
    if (!compareKeys.includes(key as (typeof compareKeys)[number]) && memberData[key] !== undefined) {
      return true
    }
  }

  return false
}

async function applyMemberContactFields(
  familyId: number,
  memberId: number,
  memberData: Record<string, unknown>,
  existing: Record<string, unknown>,
): Promise<string[]> {
  await ensureFamilyMembershipSchema()
  const applied: string[] = []

  if (memberData.email !== undefined) {
    const next = String(memberData.email ?? "")
    const prev = String(existing.email ?? "")
    if (next !== prev) {
      await sql`
        UPDATE family_members_v2
        SET email = ${next || null}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${memberId} AND family_id = ${familyId}
      `
      applied.push("email")
    }
  }

  if (memberData.phone !== undefined) {
    const next = String(memberData.phone ?? "")
    const prev = String(existing.phone ?? "")
    if (next !== prev) {
      await sql`
        UPDATE family_members_v2
        SET phone = ${next || null}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${memberId} AND family_id = ${familyId}
      `
      applied.push("phone")
    }
  }

  return applied
}

// POST - Add or update a family member (contact fields immediate; other edits need approval)
export async function POST(request: Request) {
  try {
    const ctx = await authUserContext(request)
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const memberData = normalizeMemberPayload(await request.json())
    const family = await resolveFamilyForUser(ctx.userId, ctx.email)

    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 })
    }

    const memberId =
      memberData.id != null && Number.isFinite(Number(memberData.id))
        ? Number(memberData.id)
        : null

    if (memberId) {
      const existingRows = await sql`
        SELECT * FROM family_members_v2
        WHERE id = ${memberId} AND family_id = ${family.id}
        LIMIT 1
      `
      if (existingRows.length === 0) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 })
      }

      const existing = existingRows[0]
      const directApplied = await applyMemberContactFields(
        family.id,
        memberId,
        memberData,
        existing,
      )
      const needsApproval = hasNonContactMemberChanges(memberData, existing)

      if (needsApproval) {
        await sql`
          INSERT INTO pending_family_changes 
            (family_id, clerk_user_id, change_type, member_id, member_data)
          VALUES 
            (${family.id}, ${ctx.userId}, 'update_member', 
             ${memberId}, ${JSON.stringify(memberData)})
        `
        return NextResponse.json({
          success: true,
          message:
            directApplied.length > 0
              ? "Contact info saved; other member changes submitted for approval"
              : "Member update submitted for approval",
          directApplied,
          pending: true,
        })
      }

      return NextResponse.json({
        success: true,
        message:
          directApplied.length > 0
            ? "Contact info saved"
            : "No changes detected",
        directApplied,
        pending: false,
      })
    }

    await sql`
      INSERT INTO pending_family_changes 
        (family_id, clerk_user_id, change_type, member_id, member_data)
      VALUES 
        (${family.id}, ${ctx.userId}, 'add_member', 
         ${null}, ${JSON.stringify(memberData)})
    `

    return NextResponse.json({
      success: true,
      message: "New member submitted for approval",
      pending: true,
    })
  } catch (error) {
    console.error("Error submitting member changes:", error)
    return NextResponse.json({ error: "Failed to submit changes" }, { status: 500 })
  }
}

// DELETE - Remove a family member (submitted for approval)
export async function DELETE(request: Request) {
  try {
    const ctx = await authUserContext(request)
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { memberId } = await request.json()
    const family = await resolveFamilyForUser(ctx.userId, ctx.email)

    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 })
    }

    const members = await sql`
      SELECT * FROM family_members_v2
      WHERE id = ${memberId} AND family_id = ${family.id}
    `

    if (members.length === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    await sql`
      INSERT INTO pending_family_changes 
        (family_id, clerk_user_id, change_type, member_id, member_data)
      VALUES 
        (${family.id}, ${ctx.userId}, 'remove_member', 
         ${memberId}, ${JSON.stringify(members[0])})
    `

    return NextResponse.json({
      success: true,
      message: "Member removal submitted for approval",
    })
  } catch (error) {
    console.error("Error submitting member removal:", error)
    return NextResponse.json({ error: "Failed to submit changes" }, { status: 500 })
  }
}
