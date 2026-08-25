import { NextResponse } from "next/server"
import { getCurrentAdmin } from "@/lib/clerk-auth"
import { ADMIN_UI_COOKIE, parseAdminUiMode } from "@/lib/admin-ui-mode"

export async function POST(request: Request) {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { mode?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const mode = parseAdminUiMode(body.mode)
  const res = NextResponse.json({ ok: true, mode })
  res.cookies.set(ADMIN_UI_COOKIE, mode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  })
  return res
}
