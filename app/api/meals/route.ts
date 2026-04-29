import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const sql = neon(process.env.NEON_DATABASE_URL!)
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const mealType = searchParams.get("mealType")

    let query = `SELECT * FROM meals WHERE 1=1`
    const params: string[] = []

    if (date) {
      params.push(date)
      query += ` AND date = $${params.length}`
    }

    if (mealType) {
      params.push(mealType)
      query += ` AND meal_type = $${params.length}`
    }

    query += ` ORDER BY date, CASE meal_type WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 WHEN 'dinner' THEN 3 END`

    const meals = await sql(query, params)

    return NextResponse.json({ meals })
  } catch (error) {
    console.error("Error fetching meals:", error)
    return NextResponse.json({ error: "Failed to fetch meals" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const sql = neon(process.env.NEON_DATABASE_URL!)
    const body = await request.json()
    const { date, meal_type, main_dish, sides, dessert, drinks, notes, title } = body

    const result = await sql`
      INSERT INTO meals (date, meal_type, main_dish, sides, dessert, drinks, notes, title)
      VALUES (${date}, ${meal_type}, ${main_dish}, ${sides || null}, ${dessert || null}, ${drinks || null}, ${notes || null}, ${title || null})
      RETURNING *
    `

    return NextResponse.json({ meal: result[0] })
  } catch (error) {
    console.error("Error creating meal:", error)
    return NextResponse.json({ error: "Failed to create meal" }, { status: 500 })
  }
}
