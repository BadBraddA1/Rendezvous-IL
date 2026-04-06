import { NextResponse } from "next/server"
import { checkAdminAuth, logAuditAction } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function GET() {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const registrations = await sql`
      SELECT 
        r.family_last_name,
        r.email,
        r.husband_phone,
        r.wife_phone,
        r.address,
        r.city,
        r.state,
        r.zip,
        r.lodging_type,
        r.payment_status,
        r.created_at,
        fm.first_name,
        fm.date_of_birth,
        fm.age
      FROM registrations r
      LEFT JOIN family_members fm ON r.id = fm.registration_id
      ORDER BY r.created_at DESC
    `

    // Convert to CSV
    const headers = [
      "Family Name",
      "Email",
      "Phone",
      "Address",
      "City",
      "State",
      "Zip",
      "Lodging",
      "Payment",
      "Member Name",
      "Age",
      "Registered",
    ]
    const rows = registrations.map((r) => [
      r.family_last_name,
      r.email,
      r.husband_phone,
      `${r.address}, ${r.city}`,
      r.city,
      r.state,
      r.zip,
      r.lodging_type,
      r.payment_status,
      r.first_name || "",
      r.age || "",
      new Date(r.created_at).toLocaleDateString(),
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")

    await logAuditAction(admin.email, "export_registrations", "registrations")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="registrations-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("[v0] Export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
