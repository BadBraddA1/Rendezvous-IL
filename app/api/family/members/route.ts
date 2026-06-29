import { NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { sql } from "@/lib/db"
import { resolveFamilyForUser } from "@/lib/family-auth"

// POST - Add or update a family member (submitted for approval)
export async function POST(request: Request) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userEmail = user.emailAddresses[0]?.emailAddress
    const memberData = await request.json()
    const family = await resolveFamilyForUser(user.id, userEmail)

    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 })
    }
    const changeType = memberData.id ? 'update_member' : 'add_member'

    // Create pending change for member
    await sql`
      INSERT INTO pending_family_changes 
        (family_id, clerk_user_id, change_type, member_id, member_data)
      VALUES 
        (${family.id}, ${user.id}, ${changeType}, 
         ${memberData.id || null}, ${JSON.stringify(memberData)})
    `

    return NextResponse.json({ 
      success: true, 
      message: memberData.id 
        ? "Member update submitted for approval" 
        : "New member submitted for approval"
    })
  } catch (error) {
    console.error("Error submitting member changes:", error)
    return NextResponse.json({ error: "Failed to submit changes" }, { status: 500 })
  }
}

// DELETE - Remove a family member (submitted for approval)
export async function DELETE(request: Request) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userEmail = user.emailAddresses[0]?.emailAddress
    const { memberId } = await request.json()
    const family = await resolveFamilyForUser(user.id, userEmail)

    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 })
    }

    // Get current member data for the change record
    const members = await sql`
      SELECT * FROM family_members_v2
      WHERE id = ${memberId} AND family_id = ${family.id}
    `

    if (members.length === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Create pending change for member removal
    await sql`
      INSERT INTO pending_family_changes 
        (family_id, clerk_user_id, change_type, member_id, member_data)
      VALUES 
        (${family.id}, ${user.id}, 'remove_member', 
         ${memberId}, ${JSON.stringify(members[0])})
    `

    return NextResponse.json({ 
      success: true, 
      message: "Member removal submitted for approval"
    })
  } catch (error) {
    console.error("Error submitting member removal:", error)
    return NextResponse.json({ error: "Failed to submit changes" }, { status: 500 })
  }
}
