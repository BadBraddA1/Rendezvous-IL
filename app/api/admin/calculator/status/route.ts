import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { getCurrentAdmin, getAdminPermissions } from "@/lib/clerk-auth"
import {
  isPublicCalculatorEnabled,
  setPublicCalculatorEnabled,
} from "@/lib/calculator-settings"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const enabled = await isPublicCalculatorEnabled()
    return NextResponse.json({ enabled })
  } catch (error) {
    console.error("Error fetching calculator status:", error)
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || !getAdminPermissions(admin.role).canEdit) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = (await request.json()) as { enabled?: boolean }
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 })
    }

    const enabled = await setPublicCalculatorEnabled(body.enabled)
    revalidatePath("/calculator")

    return NextResponse.json({ success: true, enabled })
  } catch (error) {
    console.error("Error updating calculator status:", error)
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
  }
}
