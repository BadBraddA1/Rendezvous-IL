import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { authUserContext } from "@/lib/clerk-auth"

export const dynamic = "force-dynamic"

async function ensureAppFeedbackTable() {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS app_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      clerk_user_id TEXT,
      email TEXT,
      rating INTEGER NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      platform TEXT NOT NULL,
      app_version TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

/** In-app product feedback (bugs / ideas) — not the end-of-event EEF survey. */
export async function POST(request: Request) {
  try {
    const ctx = await authUserContext(request)
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as {
      rating?: number
      message?: string
      category?: string
      platform?: string
      appVersion?: string
    }

    const rating = Number(body.rating)
    const message = String(body.message ?? "").trim()
    const category = String(body.category ?? "other").trim().slice(0, 40) || "other"
    const platform = String(body.platform ?? "unknown").trim().slice(0, 40) || "unknown"
    const appVersion = String(body.appVersion ?? "").trim().slice(0, 40) || null

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 })
    }
    if (message.length < 3) {
      return NextResponse.json({ error: "Please add a short note" }, { status: 400 })
    }

    await ensureAppFeedbackTable()
    await sql`
      INSERT INTO app_feedback (
        clerk_user_id, email, rating, category, message, platform, app_version
      ) VALUES (
        ${ctx.userId},
        ${ctx.email ?? null},
        ${Math.round(rating)},
        ${category},
        ${message.slice(0, 4000)},
        ${platform},
        ${appVersion}
      )
    `

    return NextResponse.json({
      success: true,
      message: "Thanks — we got your feedback.",
    })
  } catch (error) {
    console.error("[app-feedback]", error)
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 })
  }
}
