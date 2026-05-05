import { NextResponse } from "next/server"

// This timestamp is set at build time. When you deploy new code, the server
// restarts and generates a new BUILD_TIME — any LU page polling this endpoint
// will see the version change and auto-refresh.
const BUILD_TIME = Date.now().toString()

export async function GET() {
  return NextResponse.json({ version: BUILD_TIME })
}
