import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { authUserContext } from "@/lib/clerk-auth"
import { resolveFamilyForUser } from "@/lib/family-auth"
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
    return normalized
  }

  const memberType = normalized.member_type as ProfileMemberType | undefined
  if (memberType && memberType !== "child") {
    normalized.age_group = ageGroupForMemberType(memberType)
  } else if (memberType === "child" && !normalized.age_group) {
    normalized.age_group = ageGroupForMemberType("child")
  }

  if (normalized.phone !== undefined) {
    normalized.phone = formatPhoneForStorage(String(normalized.phone ?? "")) ?? ""
  }

  return normalized
}

// POST - Add or update a family member (submitted for approval)
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
    const changeType = memberData.id ? "update_member" : "add_member"

    await sql`
      INSERT INTO pending_family_changes 
        (family_id, clerk_user_id, change_type, member_id, member_data)
      VALUES 
        (${family.id}, ${ctx.userId}, ${changeType}, 
         ${memberData.id || null}, ${JSON.stringify(memberData)})
    `

    return NextResponse.json({
      success: true,
      message: memberData.id
        ? "Member update submitted for approval"
        : "New member submitted for approval",
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
