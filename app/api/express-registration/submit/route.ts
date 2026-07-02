import { NextResponse } from "next/server"
import type { RegistrationData } from "@/types/registration"
import { canAccessExpressRegistrationPreview } from "@/lib/registration-access"
import { isSignatureEmailsEnabled } from "@/lib/registration-settings"
import { createSignatureRequests } from "@/lib/signature-requests"
import { submitTestRegistration } from "@/lib/submit-test-registration"

/** Submit an express (review & confirm) registration. Marked EXPRESS_TEST while in preview. */
export async function POST(request: Request) {
  if (!(await canAccessExpressRegistrationPreview())) {
    return NextResponse.json(
      { error: "Express registration preview is not available" },
      { status: 403 },
    )
  }

  try {
    const data = (await request.json()) as RegistrationData
    const registrationId = await submitTestRegistration(data, { paymentNotes: "EXPRESS_TEST" })

    let signatureEmailsSent = false
    if (await isSignatureEmailsEnabled()) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http")
        ? process.env.NEXT_PUBLIC_BASE_URL
        : new URL(request.url).origin
      await createSignatureRequests(registrationId, data, baseUrl)
      signatureEmailsSent = true
    }

    return NextResponse.json({ success: true, registrationId, testMode: true, signatureEmailsSent })
  } catch (error) {
    console.error("[Express Registration] Submission error:", error)
    const message = error instanceof Error ? error.message : "Failed to submit registration"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
