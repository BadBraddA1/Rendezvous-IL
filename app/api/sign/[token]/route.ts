import { NextResponse } from "next/server"
import {
  getSignatureRequestByToken,
  signSignatureRequest,
} from "@/lib/signature-requests"

export const dynamic = "force-dynamic"

/** Public endpoint — the unguessable token is the credential. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const body = await request.json().catch(() => ({}))
    const signedName = typeof body.signedName === "string" ? body.signedName.trim() : ""

    if (!signedName) {
      return NextResponse.json({ error: "Please type your full name to sign." }, { status: 400 })
    }

    const context = await getSignatureRequestByToken(token)
    if (!context) {
      return NextResponse.json({ error: "This signing link is not valid." }, { status: 404 })
    }

    await signSignatureRequest(token, signedName)

    const updated = await getSignatureRequestByToken(token)
    const others = (updated?.others ?? []).map((o) => ({
      name: o.parent_name,
      signed: Boolean(o.signed_at),
    }))

    return NextResponse.json({
      success: true,
      allSigned: others.every((o) => o.signed),
      others,
    })
  } catch (error) {
    console.error("[sign] Failed to record signature:", error)
    return NextResponse.json({ error: "Failed to record signature" }, { status: 500 })
  }
}
