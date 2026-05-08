import { neon } from "@neondatabase/serverless"
import { AdminNav } from "@/components/admin/admin-nav"
import { MealsForm } from "./meals-form"

async function getMeals() {
  const sql = neon(process.env.NEON_DATABASE_URL!)
  const meals = await sql`
    SELECT * FROM meals 
    ORDER BY date, 
    CASE meal_type WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 WHEN 'dinner' THEN 3 END
  `
  return meals
}

export default async function MealsAdminPage() {
  const admin = {
    email: "admin@braddcorp.com",
    fullName: "Admin"
  }

  const meals = await getMeals()

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="meals" admin={admin} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Meal Menu Management</h1>
          <MealsForm initialMeals={meals} />
        </div>
      </main>
    </div>
  )
}
