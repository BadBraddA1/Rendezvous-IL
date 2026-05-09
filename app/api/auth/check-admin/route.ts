import { NextResponse } from "next/server"
import { getAdminRole } from "@/lib/clerk-auth"

export async function GET() {
  try {
    const role = await getAdminRole()
    
    return NextResponse.json({
      isAdmin: role !== null,
      role: role,
    })
  } catch (error) {
    console.error("[Check Admin] Error:", error)
    return NextResponse.json({ isAdmin: false, role: null })
  }
}
