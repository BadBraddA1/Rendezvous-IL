import { type NextRequest, NextResponse } from "next/server"
import { checkAdminAuth, logAuditAction } from "@/lib/admin-auth"
import { getRequestAuditMeta } from "@/lib/audit-log"
import { isSignatureEmailsEnabled } from "@/lib/registration-settings"
import {
  getSignatureRequestsForRegistration,
  markSignatureRequestSigned,
  resendSignatureEmail,
} from "@/lib/signature-requests"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const requests = await getSignatureRequestsForRegistration(Number(id))
    return NextResponse.json({
      // Whether pending signatures currently block check-in (feature toggle).
      enforced: await isSignatureEmailsEnabled(),
      requests: requests.map((r) => ({
        id: r.id,
        role: r.role,
        parent_name: r.parent_name,
        email: r.email,
        signed_name: r.signed_name,
        signed_at: r.signed_at,
        sent_at: r.sent_at,
      })),
    })
  } catch (error) {
    console.error("[admin/signatures] GET error:", error)
    return NextResponse.json({ error: "Failed to load signature requests" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminAuth()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const requestId = Number(body.requestId)
    const action = body.action as "resend" | "mark-signed"

    if (!requestId || (action !== "resend" && action !== "mark-signed")) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const { ipAddress, userAgent } = getRequestAuditMeta(req)

    if (action === "resend") {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http")
        ? process.env.NEXT_PUBLIC_BASE_URL
        : req.nextUrl.origin
      const sent = await resendSignatureEmail(requestId, baseUrl)
      if (!sent) {
        return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
      }
      await logAuditAction(
        admin.email,
        "resend_signature_email",
        "registration",
        Number(id),
        { signature_request_id: requestId },
        ipAddress,
        userAgent,
      )
      return NextResponse.json({ success: true })
    }

    const marked = await markSignatureRequestSigned(requestId, admin.email)
    if (!marked) {
      return NextResponse.json({ error: "Signature request not found" }, { status: 404 })
    }
    await logAuditAction(
      admin.email,
      "mark_signature_signed",
      "registration",
      Number(id),
      { signature_request_id: requestId },
      ipAddress,
      userAgent,
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[admin/signatures] POST error:", error)
    return NextResponse.json({ error: "Failed to update signature request" }, { status: 500 })
  }
}
