import { NextResponse } from "next/server"
import { getCurrentAdmin } from "@/lib/clerk-auth"
import { listWorshipSongSubmissionsForYear } from "@/lib/worship-song-submissions"
import { formatVerseChoice } from "@/lib/worship-song-submissions"

export const dynamic = "force-dynamic"

/** GET /api/admin/worship-songs?year=2027 */
export async function GET(request: Request) {
  const admin = await getCurrentAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const rows = await listWorshipSongSubmissionsForYear(searchParams.get("year"))
  return NextResponse.json({
    count: rows.length,
    items: rows.map((row) => ({
      ...row,
      songs: row.songs.map((s) => ({
        ...s,
        versesLabel: formatVerseChoice(s.verses),
      })),
    })),
  })
}
