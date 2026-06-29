import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { getAdminPermissions } from "@/lib/clerk-auth"
import { fetchAdminRegistrationList } from "@/lib/admin-registration-queries"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export async function GET(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const lodging = searchParams.get("lodging")
    const year = parseRegistrationEventYear(searchParams.get("year"))
    const hasSearch = search.length > 0
    const permissions = getAdminPermissions(admin.role)

    if (!hasSearch && !permissions.canViewRegistrations) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (hasSearch && !permissions.canViewRegistrations && !permissions.canCheckIn) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const registrations = await fetchAdminRegistrationList({
      year,
      search,
      lodging,
    })

    return NextResponse.json({ year, registrations })
  } catch (error) {
    console.error("[v0] Registrations fetch error:", error)
    return NextResponse.json({ year: 2027, registrations: [] }, { status: 200 })
  }
}
