import { NextResponse } from "next/server"
import { authUserContext } from "@/lib/clerk-auth"
import { resolveFamilyForUser } from "@/lib/family-auth"
import {
  assertFamilyCanUploadLessonSlides,
  deleteLessonSlides,
  uploadLessonSlides,
  validateLessonSlideFile,
} from "@/lib/lesson-slides"

export const dynamic = "force-dynamic"
/** Large PPT decks — allow Fluid Compute time. */
export const maxDuration = 60

type Params = { params: Promise<{ signupId: string }> }

/**
 * Presenter upload / replace lesson PowerPoint or PDF for their volunteer signup.
 * multipart form field: `file`
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const ctx = await authUserContext(request)
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const family = await resolveFamilyForUser(ctx.userId, ctx.email)
    if (!family) {
      return NextResponse.json({ error: "No family profile linked" }, { status: 404 })
    }

    const { signupId: rawId } = await params
    const signupId = Number(rawId)
    if (!Number.isFinite(signupId) || signupId <= 0) {
      return NextResponse.json({ error: "Invalid signup id" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const access = await assertFamilyCanUploadLessonSlides(
      family,
      signupId,
      searchParams.get("year"),
    )

    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    const validationError = validateLessonSlideFile(file)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const submission = await uploadLessonSlides({
      signupId: access.signupId,
      eventYear: access.eventYear,
      bytes: await file.arrayBuffer(),
      contentType: file.type || "application/octet-stream",
      fileName: file.name || "lesson.pptx",
      clerkUserId: ctx.userId,
    })

    return NextResponse.json({ slide: submission })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed"
    const status =
      message.includes("not found") || message.includes("No registration")
        ? 404
        : message.includes("not a lesson")
          ? 403
          : 400
    console.error("[family/lessons/slides] POST:", error)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const ctx = await authUserContext(request)
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const family = await resolveFamilyForUser(ctx.userId, ctx.email)
    if (!family) {
      return NextResponse.json({ error: "No family profile linked" }, { status: 404 })
    }

    const { signupId: rawId } = await params
    const signupId = Number(rawId)
    if (!Number.isFinite(signupId) || signupId <= 0) {
      return NextResponse.json({ error: "Invalid signup id" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    await assertFamilyCanUploadLessonSlides(family, signupId, searchParams.get("year"))
    const removed = await deleteLessonSlides(signupId)
    return NextResponse.json({ ok: true, removed })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed"
    console.error("[family/lessons/slides] DELETE:", error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
