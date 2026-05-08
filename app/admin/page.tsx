import { AdminNav } from "@/components/admin/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, DollarSign, Tent, UserPlus, Calendar } from "lucide-react"
import Link from "next/link"
import { sql } from "@/lib/db"
import { YearSelector } from "@/components/admin/year-selector"

interface PageProps {
  searchParams: Promise<{ year?: string }>
}

export default async function AdminDashboard({ searchParams }: PageProps) {
  const params = await searchParams

  // Temporary: skip auth for now
  const admin = { 
    email: "admin@braddcorp.com",
    fullName: "Admin"
  }

  // Get selected year (default to 2027)
  const selectedYear = params.year ? parseInt(params.year) : 2027

  // Fetch available years
  let availableYears: number[] = [2026, 2027]
  try {
    const yearsData = await sql`
      SELECT DISTINCT event_year FROM registrations_v2 ORDER BY event_year DESC
    `
    if (yearsData.length > 0) {
      availableYears = yearsData.map((y: { event_year: number }) => y.event_year)
      // Always include 2027 even if no registrations yet
      if (!availableYears.includes(2027)) {
        availableYears.unshift(2027)
      }
    }
  } catch (error) {
    console.error("[v0] Error fetching years:", error)
  }

  // Fetch stats for selected year using new schema
  let stats = {
    totalRegistrations: 0,
    totalAttendees: 0,
    totalRevenue: 0,
    paidInFull: 0,
    pending: 0,
    unpaid: 0,
  }

  let recentRegistrations: {
    id: number
    family_last_name: string
    email: string
    lodging_type: string
    payment_status: string
    created_at: string
    attendee_count: number
  }[] = []

  try {
    // Get stats from new tables
    const [statsData] = await sql`
      SELECT 
        COUNT(DISTINCT rv.id)::int as total_registrations,
        COUNT(ra.id)::int as total_attendees,
        COALESCE(SUM(rv.total_cost), 0)::numeric as total_revenue,
        COUNT(DISTINCT CASE WHEN rv.payment_status = 'paid' THEN rv.id END)::int as paid_in_full,
        COUNT(DISTINCT CASE WHEN rv.payment_status = 'pending' THEN rv.id END)::int as pending,
        COUNT(DISTINCT CASE WHEN rv.payment_status IS NULL OR rv.payment_status = 'unpaid' THEN rv.id END)::int as unpaid
      FROM registrations_v2 rv
      LEFT JOIN registration_attendees ra ON rv.id = ra.registration_id
      WHERE rv.event_year = ${selectedYear}
    `

    stats = {
      totalRegistrations: statsData.total_registrations,
      totalAttendees: statsData.total_attendees,
      totalRevenue: Number(statsData.total_revenue),
      paidInFull: statsData.paid_in_full,
      pending: statsData.pending,
      unpaid: statsData.unpaid,
    }

    // Get recent registrations from new tables
    recentRegistrations = await sql`
      SELECT 
        rv.id,
        f.family_last_name,
        f.email,
        rv.lodging_type,
        rv.payment_status,
        rv.created_at,
        COUNT(ra.id)::int as attendee_count
      FROM registrations_v2 rv
      JOIN families f ON rv.family_id = f.id
      LEFT JOIN registration_attendees ra ON rv.id = ra.registration_id
      WHERE rv.event_year = ${selectedYear}
      GROUP BY rv.id, f.family_last_name, f.email
      ORDER BY rv.created_at DESC
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
              <p className="text-muted-foreground">Monitor registrations and manage your event</p>
            </div>
            <YearSelector years={availableYears} selectedYear={selectedYear} />
          </div>

          {/* Year Indicator */}
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="font-medium">Viewing data for Rendezvous {selectedYear}</span>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-3">
            <Button asChild size="lg" className="h-auto flex-col gap-2 py-6">
              <Link href={`/admin/registrations?year=${selectedYear}`}>
                <Users className="h-8 w-8" />
                <span>View All Registrations</span>
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-6 bg-transparent">
              <Link href={`/admin/registrations?year=${selectedYear}`}>
                <UserPlus className="h-8 w-8" />
                <span>Export Name Badges</span>
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-6 bg-transparent">
              <Link href={`/admin/registrations?year=${selectedYear}`}>
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
                <p className="text-xs text-muted-foreground">Registered families for {selectedYear}</p>
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
                    <span className="text-green-600">Paid:</span>
                    <span className="font-bold">{stats.paidInFull}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-600">Pending:</span>
                    <span className="font-bold">{stats.pending}</span>
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
              <CardTitle>Recent Registrations ({selectedYear})</CardTitle>
              <CardDescription>Latest families who have registered for Rendezvous {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              {recentRegistrations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No registrations yet for {selectedYear}</p>
              ) : (
                <div className="space-y-4">
                  {recentRegistrations.map((reg) => (
                    <div key={reg.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="space-y-1">
                        <p className="font-medium">{reg.family_last_name} Family</p>
                        <p className="text-sm text-muted-foreground">{reg.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {reg.attendee_count} attendees • {reg.lodging_type || "No lodging selected"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {reg.payment_status === "paid" ? (
                            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                              Paid
                            </span>
                          ) : reg.payment_status === "pending" ? (
                            <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700">
                              Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                              Unpaid
                            </span>
                          )}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/registrations?year=${selectedYear}`}>View</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <Link href={`/admin/registrations?year=${selectedYear}`}>View All Registrations</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
