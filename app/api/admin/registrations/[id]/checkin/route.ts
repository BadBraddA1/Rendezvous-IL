import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { room_keys, tshirts_distributed } = body

    const keys = Array.isArray(room_keys) ? room_keys : []
    const keyCount = keys.length

    await sql`
      UPDATE registrations
      SET 
        checked_in = true,
        checked_in_at = NOW(),
        room_keys = ${keys},
        keys_taken_count = ${keyCount},
        tshirts_distributed = ${tshirts_distributed ?? false},
        updated_at = NOW()
      WHERE id = ${id}
    `

    const [registration] = await sql`SELECT * FROM registrations WHERE id = ${id}`
    return NextResponse.json({ success: true, registration })
  } catch (error) {
    console.error("[v0] Failed to check in registration:", error)
    return NextResponse.json({ error: "Failed to check in" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    await sql`
      UPDATE registrations
      SET 
        checked_in = false,
        checked_in_at = NULL,
        room_keys = '{}',
        keys_taken_count = 0,
        keys_returned = false,
        keys_returned_at = NULL,
        tshirts_distributed = false,
        updated_at = NOW()
      WHERE id = ${id}
    `
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to undo check-in:", error)
    return NextResponse.json({ error: "Failed to undo check-in" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const updates = await req.json()

    if (updates.room_keys !== undefined) {
      const keys = Array.isArray(updates.room_keys) ? updates.room_keys : []
      await sql`UPDATE registrations SET room_keys = ${keys}, keys_taken_count = ${keys.length} WHERE id = ${id}`
    }
    if (updates.pre_assigned_keys !== undefined) {
      const keys = Array.isArray(updates.pre_assigned_keys) ? updates.pre_assigned_keys : []
      await sql`UPDATE registrations SET pre_assigned_keys = ${keys} WHERE id = ${id}`
    }
    if (updates.keys_returned !== undefined) {
      if (updates.keys_returned) {
        await sql`UPDATE registrations SET keys_returned = true, keys_returned_at = NOW() WHERE id = ${id}`
      } else {
        await sql`UPDATE registrations SET keys_returned = false, keys_returned_at = NULL WHERE id = ${id}`
      }
    }
    if (updates.tshirts_distributed !== undefined) {
      await sql`UPDATE registrations SET tshirts_distributed = ${updates.tshirts_distributed} WHERE id = ${id}`
    }

    const [registration] = await sql`SELECT * FROM registrations WHERE id = ${id}`
    return NextResponse.json({ success: true, registration })
  } catch (error) {
    console.error("[v0] Failed to update check-in:", error)
    return NextResponse.json({ error: "Failed to update check-in" }, { status: 500 })
  }
}
