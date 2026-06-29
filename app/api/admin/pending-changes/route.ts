import { NextResponse } from "next/server"
import { checkAdminAuth, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta, buildPendingChangeAuditDetails } from "@/lib/audit-log"
import { sql } from "@/lib/db"
import { enrichPendingChanges } from "@/lib/pending-family-changes"
import { formatPhoneForStorage } from "@/lib/phone-format"

// GET - Fetch all pending changes for admin review
export async function GET() {
  try {
    const admin = await checkAdminAuth()
    
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pendingRows = await sql`
      SELECT 
        pc.*,
        f.family_last_name,
        f.email as family_email,
        f.city,
        f.state
      FROM pending_family_changes pc
      JOIN families f ON f.id = pc.family_id
      WHERE pc.status = 'pending'
      ORDER BY pc.submitted_at DESC
    `

    const pendingChanges = await enrichPendingChanges(pendingRows)

    return NextResponse.json({ pendingChanges })
  } catch (error) {
    console.error("Error fetching pending changes:", error)
    return NextResponse.json({ error: "Failed to fetch pending changes" }, { status: 500 })
  }
}

// POST - Approve or reject a change
export async function POST(request: Request) {
  try {
    const admin = await checkAdminAuth()
    
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin and editor can approve changes
    if (admin.role === 'viewer') {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { changeId, action, notes } = await request.json()

    if (!changeId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    // Get the change details
    const changes = await sql`
      SELECT * FROM pending_family_changes
      WHERE id = ${changeId} AND status = 'pending'
    `

    if (changes.length === 0) {
      return NextResponse.json({ error: "Change not found" }, { status: 404 })
    }

    const change = changes[0]

    if (action === 'approve') {
      // Apply the change based on type
      if (change.change_type === 'update_field') {
        // Update the family field - use specific field updates for safety
        const fieldName =
          change.field_name === "street" ? "address" : change.field_name
        const phoneFields = new Set(["husband_phone", "wife_phone"])
        const newValue = phoneFields.has(fieldName)
          ? formatPhoneForStorage(change.new_value)
          : change.new_value
        const familyId = change.family_id
        
        // Handle known fields explicitly
        if (fieldName === 'family_last_name') {
          await sql`UPDATE families SET family_last_name = ${newValue} WHERE id = ${familyId}`
        } else if (fieldName === 'email') {
          await sql`UPDATE families SET email = ${newValue} WHERE id = ${familyId}`
        } else if (fieldName === 'husband_first_name') {
          await sql`UPDATE families SET husband_first_name = ${newValue} WHERE id = ${familyId}`
        } else if (fieldName === 'wife_first_name') {
          await sql`UPDATE families SET wife_first_name = ${newValue} WHERE id = ${familyId}`
        } else if (fieldName === 'husband_phone') {
          await sql`UPDATE families SET husband_phone = ${newValue} WHERE id = ${familyId}`
        } else if (fieldName === 'wife_phone') {
          await sql`UPDATE families SET wife_phone = ${newValue} WHERE id = ${familyId}`
        } else if (fieldName === 'address') {
          await sql`UPDATE families SET address = ${newValue} WHERE id = ${familyId}`
        } else if (fieldName === 'city') {
          await sql`UPDATE families SET city = ${newValue} WHERE id = ${familyId}`
        } else if (fieldName === 'state') {
          await sql`UPDATE families SET state = ${newValue} WHERE id = ${familyId}`
        } else if (fieldName === 'zip') {
          await sql`UPDATE families SET zip = ${newValue} WHERE id = ${familyId}`
        } else if (fieldName === 'home_congregation') {
          await sql`UPDATE families SET home_congregation = ${newValue} WHERE id = ${familyId}`
        } else {
          return NextResponse.json({ error: `Unknown field: ${fieldName}` }, { status: 400 })
        }
      } else if (change.change_type === 'add_member') {
        // Add new member
        const memberData =
          typeof change.member_data === "string"
            ? JSON.parse(change.member_data)
            : change.member_data
        const memberPhone = formatPhoneForStorage(memberData.phone)
        await sql`
          INSERT INTO family_members_v2 
            (family_id, first_name, last_name, member_type, age_group, 
             grade, gender, special_needs, notes, date_of_birth, phone)
          VALUES 
            (${change.family_id}, ${memberData.first_name}, ${memberData.last_name},
             ${memberData.member_type}, ${memberData.age_group}, ${memberData.grade || null},
             ${memberData.gender}, ${memberData.special_needs || false}, ${memberData.notes || null},
             ${memberData.date_of_birth || null}, ${memberPhone})
        `
      } else if (change.change_type === 'update_member') {
        // Update existing member
        const memberData =
          typeof change.member_data === "string"
            ? JSON.parse(change.member_data)
            : change.member_data
        const memberPhone = formatPhoneForStorage(memberData.phone)
        await sql`
          UPDATE family_members_v2
          SET first_name = ${memberData.first_name},
              last_name = ${memberData.last_name},
              member_type = ${memberData.member_type},
              age_group = ${memberData.age_group},
              grade = ${memberData.grade || null},
              gender = ${memberData.gender},
              special_needs = ${memberData.special_needs || false},
              notes = ${memberData.notes || null},
              date_of_birth = COALESCE(${memberData.date_of_birth || null}, date_of_birth),
              phone = ${memberPhone}
          WHERE id = ${change.member_id} AND family_id = ${change.family_id}
        `
      } else if (change.change_type === 'remove_member') {
        // Remove member
        await sql`
          DELETE FROM family_members_v2
          WHERE id = ${change.member_id} AND family_id = ${change.family_id}
        `
      }
    }

    // Update the change status
    await sql`
      UPDATE pending_family_changes
      SET status = ${action === 'approve' ? 'approved' : 'rejected'},
          reviewed_at = NOW(),
          reviewed_by = ${admin.email},
          review_notes = ${notes || null}
      WHERE id = ${changeId}
    `

    const { ipAddress, userAgent } = getRequestAuditMeta(request)
    await logAuditAction(
      admin.email,
      action === "approve" ? "approve_pending_change" : "reject_pending_change",
      "pending_family_change",
      changeId,
      buildPendingChangeAuditDetails(change, notes),
      ipAddress,
      userAgent,
    )

    return NextResponse.json({
      success: true, 
      message: action === 'approve' ? 'Change approved and applied' : 'Change rejected'
    })
  } catch (error) {
    console.error("Error processing change:", error)
    return NextResponse.json({ error: "Failed to process change" }, { status: 500 })
  }
}
