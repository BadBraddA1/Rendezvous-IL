import { NextResponse } from "next/server"
import { getCurrentAdmin, getAdminPermissions } from "@/lib/clerk-auth"
import {
  deleteLessonSlides,
  ensureLessonSlidesSchema,
  listLessonSlidesForYear,
  uploadLessonSlides,
  validateLessonSlideFile,
} from "@/lib/lesson-slides"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/** Staff inbox of submitted lesson decks for an event year. */
export async function GET(request: Request) {
  const admin = await getCurrentAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const slides = await listLessonSlidesForYear(searchParams.get("year"))
  return NextResponse.json({
    year: parseRegistrationEventYear(searchParams.get("year")),
    slides,
  })
}

/**
 * Staff upload on behalf of a presenter.
 * multipart: file + volunteerSignupId
 */
export async function POST(request: Request) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await ensureLessonSlidesSchema()
    const form = await request.formData()
    const file = form.get("file")
    const signupRaw = form.get("volunteerSignupId")
    const signupId = Number(signupRaw)
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }
    if (!Number.isFinite(signupId) || signupId <= 0) {
      return NextResponse.json({ error: "volunteerSignupId is required" }, { status: 400 })
    }

    const validationError = validateLessonSlideFile(file)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const yearParam =
      typeof form.get("year") === "string" ? String(form.get("year")) : null
    const eventYear = parseRegistrationEventYear(yearParam)

    const [signup] = await sql`
      SELECT id FROM volunteer_signups WHERE id = ${signupId} LIMIT 1
    `
    if (!signup) {
      return NextResponse.json({ error: "Volunteer signup not found" }, { status: 404 })
    }

    const slide = await uploadLessonSlides({
      signupId,
      eventYear,
      bytes: await file.arrayBuffer(),
      contentType: file.type || "application/octet-stream",
      fileName: file.name || "lesson.pptx",
      clerkUserId: admin.id,
    })

    return NextResponse.json({ slide })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed"
    console.error("[admin/lesson-slides] POST:", error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !getAdminPermissions(admin.role).canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const signupId = Number(searchParams.get("volunteerSignupId"))
    if (!Number.isFinite(signupId) || signupId <= 0) {
      return NextResponse.json({ error: "volunteerSignupId is required" }, { status: 400 })
    }
    const removed = await deleteLessonSlides(signupId)
    return NextResponse.json({ ok: true, removed })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
