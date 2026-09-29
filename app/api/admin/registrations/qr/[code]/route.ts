import { type NextRequest, NextResponse } from "next/server"
import { checkCheckInAuth } from "@/lib/admin-auth"
import { resolveDirectoryFamilyIdForRegistration } from "@/lib/checkin-directory-family"
import { getFamilyDirectorySettings } from "@/lib/family-directory"
import { listFamilyPhotoFaces } from "@/lib/family-photo-faces"
import { sql } from "@/lib/db"
import { normalizeRegistrationRow } from "@/lib/normalize-string-array"

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const admin = await checkCheckInAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { code } = await params
    const cleaned = code.trim().toUpperCase()

    const [registration] = await sql`
      SELECT * FROM registrations 
      WHERE UPPER(checkin_qr_code) = ${cleaned}
      LIMIT 1
    `

    if (!registration) {
      return NextResponse.json({ error: "Registration not found for this QR code" }, { status: 404 })
    }

    const familyMembers = await sql`
      SELECT * FROM family_members 
      WHERE registration_id = ${registration.id}
      ORDER BY age DESC NULLS LAST, id ASC
    `

    const tshirtOrders = await sql`
      SELECT * FROM tshirt_orders 
      WHERE registration_id = ${registration.id}
      ORDER BY id ASC
    `

    const directoryFamilyId = await resolveDirectoryFamilyIdForRegistration({
      registrationId: Number(registration.id),
      email: registration.email != null ? String(registration.email) : null,
    })

    let directoryPhotoUrl: string | null = null
    let directoryFacesLabeled = 0
    let directoryFacesTotal = 0
    if (directoryFamilyId) {
      const settings = await getFamilyDirectorySettings(directoryFamilyId)
      directoryPhotoUrl = settings?.photo_url ?? null
      if (directoryPhotoUrl) {
        const faces = await listFamilyPhotoFaces(directoryFamilyId)
        directoryFacesTotal = faces.length
        directoryFacesLabeled = faces.filter((f) => Boolean(f.label?.trim())).length
      }
    }

    return NextResponse.json({
      registration: normalizeRegistrationRow(registration),
      family_members: familyMembers,
      tshirt_orders: tshirtOrders,
      directory_family_id: directoryFamilyId,
      directory_photo_url: directoryPhotoUrl,
      directory_faces_labeled: directoryFacesLabeled,
      directory_faces_total: directoryFacesTotal,
    })
  } catch (error) {
    console.error("[v0] Failed to lookup by QR code:", error)
    return NextResponse.json({ error: "Failed to lookup registration" }, { status: 500 })
  }
}
