import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { listAdminDirectoryFamilies } from "@/lib/admin-directory"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const year = parseRegistrationEventYear(req.nextUrl.searchParams.get("year"))
    return NextResponse.json({ families: await listAdminDirectoryFamilies(year) })
  } catch (error) {
    console.error("[admin/directory/families] GET error:", error)
    return NextResponse.json({ error: "Failed to load directory families" }, { status: 500 })
  }
}
