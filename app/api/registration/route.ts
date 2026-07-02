import { NextResponse } from "next/server"
import type { RegistrationData } from "@/types/registration"
import { canAccessRegistrationTest } from "@/lib/registration-access"
import { isSignatureEmailsEnabled } from "@/lib/registration-settings"
import { createSignatureRequests } from "@/lib/signature-requests"
import { submitTestRegistration } from "@/lib/submit-test-registration"

export async function POST(request: Request) {
  if (!(await canAccessRegistrationTest())) {
    return NextResponse.json(
      {
        error:
          "Registration testing is off. Enable it on the admin dashboard, then try again while signed in as an admin.",
      },
      { status: 403 },
    )
  }

  try {
    const data = (await request.json()) as RegistrationData
    const registrationId = await submitTestRegistration(data)

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
    console.error("[Registration] Test submission error:", error)
    const message = error instanceof Error ? error.message : "Failed to submit registration"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
