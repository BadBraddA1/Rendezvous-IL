import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { AdminNav } from "@/components/admin/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, DollarSign, Tent, UserPlus } from "lucide-react"
import Link from "next/link"
import { sql } from "@/lib/db"

export default async function AdminDashboard() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("admin_session")

  if (!sessionCookie || sessionCookie.value !== "authenticated") {
    redirect("/admin/login")
  }

  const admin = { email: "admin@braddcorp.com" }

  // Fetch stats directly in the server component
  let stats = {
    totalRegistrations: 0,
    totalAttendees: 0,
    totalRevenue: 0,
    paidInFull: 0,
    regFeePaid: 0,
    unpaid: 0,
  }

  let recentRegistrations: any[] = []

  try {
    // Get basic stats
    const [statsData] = await sql`
      SELECT 
        COUNT(DISTINCT r.id)::int as total_registrations,
        COUNT(fm.id)::int as total_attendees,
        COALESCE(SUM(r.lodging_total + r.tshirt_total + r.climbing_tower_total + r.registration_fee), 0)::numeric as total_revenue,
        COUNT(DISTINCT CASE WHEN r.full_payment_paid = true THEN r.id END)::int as paid_in_full,
        COUNT(DISTINCT CASE WHEN r.registration_fee_paid = true AND r.full_payment_paid = false THEN r.id END)::int as reg_fee_paid,
        COUNT(DISTINCT CASE WHEN r.registration_fee_paid = false THEN r.id END)::int as unpaid
      FROM registrations r
      LEFT JOIN family_members fm ON r.id = fm.registration_id
    `

    stats = {
      totalRegistrations: statsData.total_registrations,
      totalAttendees: statsData.total_attendees,
      totalRevenue: Number(statsData.total_revenue),
      paidInFull: statsData.paid_in_full,
      regFeePaid: statsData.reg_fee_paid,
      unpaid: statsData.unpaid,
    }

    // Get recent registrations
    recentRegistrations = await sql`
      SELECT 
        r.id,
        r.family_last_name,
        r.email,
        r.lodging_type,
        r.full_payment_paid,
        r.registration_fee_paid,
        r.created_at,
        COUNT(fm.id)::int as attendee_count
      FROM registrations r
      LEFT JOIN family_members fm ON r.id = fm.registration_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
      LIMIT 5
    `
  } catch (error) {
    console.error("[v0] Dashboard data fetch error:", error)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNav currentPage="dashboard" admin={admin} />

      <main className="flex-1 bg-background p-6">
        <div className="container mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
            <p className="text-muted-foreground">Monitor registrations and manage your event</p>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-3">
            <Button asChild size="lg" className="h-auto flex-col gap-2 py-6">
              <Link href="/admin/registrations">
                <Users className="h-8 w-8" />
                <span>View All Registrations</span>
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-6 bg-transparent">
              <Link href="/admin/registrations">
                <UserPlus className="h-8 w-8" />
                <span>Export Name Badges</span>
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-6 bg-transparent">
              <Link href="/admin/registrations">
                <DollarSign className="h-8 w-8" />
                <span>Send Bulk Email</span>
              </Link>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRegistrations}</div>
                <p className="text-xs text-muted-foreground">Registered families</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAttendees}</div>
                <p className="text-xs text-muted-foreground">Individual people</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Expected revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
                <Tent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Paid in Full:</span>
                    <span className="font-bold">{stats.paidInFull}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-600">Reg Fee Paid:</span>
                    <span className="font-bold">{stats.regFeePaid}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">Unpaid:</span>
                    <span className="font-bold">{stats.unpaid}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Registrations */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Registrations</CardTitle>
              <CardDescription>Latest families who have registered</CardDescription>
            </CardHeader>
            <CardContent>
              {recentRegistrations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No registrations yet</p>
              ) : (
                <div className="space-y-4">
                  {recentRegistrations.map((reg) => (
                    <div key={reg.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="space-y-1">
                        <p className="font-medium">{reg.family_last_name} Family</p>
                        <p className="text-sm text-muted-foreground">{reg.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {reg.attendee_count} attendees • {reg.lodging_type}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {reg.full_payment_paid ? (
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                              Paid in Full
                            </span>
                          ) : reg.registration_fee_paid ? (
                            <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700">
                              Reg Fee Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                              Unpaid
                            </span>
                          )}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/registrations`}>View</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <Link href="/admin/registrations">View All Registrations</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
