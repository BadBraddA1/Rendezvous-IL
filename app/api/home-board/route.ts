import { NextResponse } from "next/server"
import { getHomeBoard } from "@/lib/home-board"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseRegistrationEventYear(searchParams.get("year"))
    const board = await getHomeBoard(year)
    return NextResponse.json(board, {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=30",
      },
    })
  } catch (error) {
    console.error("[home-board] GET error:", error)
    return NextResponse.json({ error: "Failed to load home board" }, { status: 500 })
  }
}
