import { NextResponse } from "next/server"
import { BUILD_VERSION } from "@/lib/build-version"

// When you deploy new code, the server restarts and generates a new BUILD_VERSION —
// any LU page polling this endpoint will see the version change and auto-refresh.
export async function GET() {
  return NextResponse.json({ version: BUILD_VERSION })
}
