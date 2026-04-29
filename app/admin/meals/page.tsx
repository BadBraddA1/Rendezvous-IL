import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { neon } from "@neondatabase/serverless"
import { AdminNav } from "@/components/admin/admin-nav"
import { MealsForm } from "./meals-form"

async function getSession() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get("admin_session")?.value
  if (!sessionToken) return null

  const sql = neon(process.env.NEON_DATABASE_URL!)
  const sessions = await sql`
    SELECT s.*, u.email, u.role, u.first_name, u.last_name
    FROM admin_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.session_token = ${sessionToken}
    AND s.expires_at > NOW()
  `
  return sessions[0] || null
}

async function getMeals() {
  const sql = neon(process.env.NEON_DATABASE_URL!)
  const meals = await sql`
    SELECT * FROM meals 
    ORDER BY meal_date, 
    CASE meal_type WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 WHEN 'dinner' THEN 3 END
  `
  return meals
}

export default async function MealsAdminPage() {
  const session = await getSession()
  if (!session) {
    redirect("/admin/login")
  }

  const meals = await getMeals()

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="meals" admin={{ email: session.email, role: session.role }} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Meal Menu Management</h1>
          <MealsForm initialMeals={meals} />
        </div>
      </main>
    </div>
  )
}
