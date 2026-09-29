import { type NextRequest, NextResponse } from "next/server"
import { isManagedMediaUrl } from "@/lib/media-keys"

export const dynamic = "force-dynamic"

/**
 * Same-origin proxy for R2 / CDN media.
 *
 * `cdn.rendezvousil.com` is a public R2 custom domain and does not send CORS
 * headers, so the browser cannot `fetch()` photos for MediaPipe face detection
 * (Firefox throws NetworkError). Server-side fetch has no CORS restriction.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url")
  if (!raw) {
    return NextResponse.json({ error: "url is required" }, { status: 400 })
  }

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 })
  }

  if (target.protocol !== "https:") {
    return NextResponse.json({ error: "Only https media urls are allowed" }, { status: 400 })
  }

  if (!isManagedMediaUrl(target.toString())) {
    return NextResponse.json({ error: "Url is not allowed media" }, { status: 400 })
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { Accept: "image/*,*/*" },
      // Photos are public; short cache at the edge is fine.
      next: { revalidate: 60 },
    })
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: upstream.status === 404 ? 404 : 502 },
      )
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg"
    const bytes = await upstream.arrayBuffer()
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=120",
        // Helpful if anything still fetches this cross-origin.
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("[media/cdn-proxy] fetch failed:", error)
    return NextResponse.json({ error: "Could not fetch media" }, { status: 502 })
  }
}
