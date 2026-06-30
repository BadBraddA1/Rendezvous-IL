import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/nextjs/server"
import { requireFullAdminApi, logAuditAction } from "@/lib/clerk-auth"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireFullAdminApi()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: userId } = await context.params
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const mode = body.mode === "set" ? "set" : "link"
    const clerk = await clerkClient()
    const targetUser = await clerk.users.getUser(userId)
    const targetEmail = targetUser.emailAddresses[0]?.emailAddress || ""

    if (mode === "set") {
      const password = typeof body.password === "string" ? body.password : ""
      if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
      }

      await clerk.users.updateUser(userId, { password })

      await logAuditAction(
        "admin_set_user_password",
        "admin_user",
        undefined,
        { target_email: targetEmail, user_id: userId },
        request,
      )

      return NextResponse.json({ success: true, mode: "set" })
    }

    const signInToken = await clerk.signInTokens.createSignInToken({
      userId,
      expiresInSeconds: 60 * 60 * 24,
    })

    await logAuditAction(
      "admin_create_sign_in_link",
      "admin_user",
      undefined,
      { target_email: targetEmail, user_id: userId },
      request,
    )

    return NextResponse.json({
      success: true,
      mode: "link",
      url: signInToken.url,
      forgotPasswordUrl: targetEmail
        ? `/sign-in/forgot-password?email=${encodeURIComponent(targetEmail)}`
        : "/sign-in/forgot-password",
    })
  } catch (error) {
    console.error("[Admin Users] Error resetting password:", error)
    const message = error instanceof Error ? error.message : "Failed to reset password"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
