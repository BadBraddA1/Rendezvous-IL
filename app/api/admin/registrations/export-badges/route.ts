import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { sql } from "@/lib/db"

export async function GET() {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const members = await sql`
      SELECT 
        r.family_last_name,
        fm.first_name,
        fm.age,
        r.home_congregation
      FROM family_members fm
      JOIN registrations r ON fm.registration_id = r.id
      ORDER BY r.family_last_name, fm.first_name
    `

    // Create CSV for name badges
    const headers = ["First Name", "Last Name", "Age", "Congregation"]
    const rows = members.map((m) => [
      m.first_name,
      m.family_last_name,
      m.age?.toString() || "",
      m.home_congregation || "",
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="name-badges-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("[v0] Badge export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
