import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"
export const revalidate = 0

type Challenge = {
  visible: boolean
  stephen: number
  brian: number
}

const DEFAULT_CHALLENGE: Challenge = { visible: false, stephen: 0, brian: 0 }

function parse(value: unknown): Challenge {
  if (!value) return DEFAULT_CHALLENGE
  const raw = typeof value === "string" ? JSON.parse(value) : value
  return {
    visible: !!raw.visible,
    stephen: Number(raw.stephen) || 0,
    brian: Number(raw.brian) || 0,
  }
}

export async function GET() {
  try {
    const rows = await sql`SELECT value FROM app_settings WHERE key = 'ice_cream_challenge' LIMIT 1`
    const value = rows[0]?.value
    return NextResponse.json(parse(value))
  } catch (e) {
    console.error("[v0] ice-cream-challenge GET error:", e)
    return NextResponse.json(DEFAULT_CHALLENGE)
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const next: Challenge = {
      visible: !!body.visible,
      stephen: Math.max(0, Math.floor(Number(body.stephen) || 0)),
      brian: Math.max(0, Math.floor(Number(body.brian) || 0)),
    }

    await sql`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('ice_cream_challenge', ${JSON.stringify(next)}, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `

    return NextResponse.json(next)
  } catch (e) {
    console.error("[v0] ice-cream-challenge PUT error:", e)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
