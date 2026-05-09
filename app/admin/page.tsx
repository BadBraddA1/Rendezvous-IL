import { AdminNav } from "@/components/admin/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, DollarSign, ShieldX, LogIn, ScanLine, UserCheck, 
  QrCode, Megaphone, Star, Shirt, ClipboardCheck, AlertCircle, TrendingUp
} from "lucide-react"
import Link from "next/link"
import { sql } from "@/lib/db"
import { getCurrentAdmin, isAuthenticated } from "@/lib/clerk-auth"

export default async function AdminDashboard() {
  const authenticated = await isAuthenticated()
  const admin = await getCurrentAdmin()

  // Not logged in at all
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <LogIn className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Admin Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/sign-in?redirect_url=/admin">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not an admin
  if (!admin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <ShieldX className="h-7 w-7 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription>
              You don&apos;t have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="w-full">
              <Link href="/account">Go to My Account</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Default stats
  let stats = {
    totalRegistrations: 0,
    totalAttendees: 0,
    totalRevenue: 0,
    paidInFull: 0,
    regFeePaid: 0,
    unpaid: 0,
    checkedIn: 0,
    notCheckedIn: 0,
    tshirtCount: 0,
    pendingChanges: 0,
    activeAnnouncements: 0,
    feedbackCount: 0,
    avgRating: 0,
  }

  let recentRegistrations: any[] = []
  let recentCheckIns: any[] = []

  try {
    // Aggregate registration stats
    const [regStats] = await sql`
      SELECT 
        COUNT(DISTINCT r.id)::int as total_registrations,
        COUNT(fm.id)::int as total_attendees,
        COALESCE(SUM(COALESCE(r.lodging_total,0) + COALESCE(r.tshirt_total,0) + COALESCE(r.climbing_tower_total,0) + COALESCE(r.registration_fee,0)), 0)::numeric as total_revenue,
        COUNT(DISTINCT CASE WHEN r.full_payment_paid = true THEN r.id END)::int as paid_in_full,
        COUNT(DISTINCT CASE WHEN r.registration_fee_paid = true AND r.full_payment_paid = false THEN r.id END)::int as reg_fee_paid,
        COUNT(DISTINCT CASE WHEN r.registration_fee_paid = false THEN r.id END)::int as unpaid,
        COUNT(DISTINCT CASE WHEN r.checked_in = true THEN r.id END)::int as checked_in,
        COUNT(DISTINCT CASE WHEN r.checked_in = false OR r.checked_in IS NULL THEN r.id END)::int as not_checked_in
      FROM registrations r
      LEFT JOIN family_members fm ON r.id = fm.registration_id
    `

    // T-shirt total
    const [tshirtStats] = await sql`
      SELECT COALESCE(SUM(quantity), 0)::int as count FROM tshirt_orders
    `

    // Pending changes
    const [pendingStats] = await sql`
      SELECT COUNT(*)::int as count FROM pending_changes WHERE status = 'pending'
    `

    // Active announcements
    const [annStats] = await sql`
      SELECT COUNT(*)::int as count FROM announcements WHERE is_active = true
    `

    // Feedback
    const [fbStats] = await sql`
      SELECT 
        COUNT(*)::int as count,
        COALESCE(AVG(rating), 0)::numeric as avg_rating
      FROM feedback
    `

    stats = {
      totalRegistrations: regStats.total_registrations,
      totalAttendees: regStats.total_attendees,
      totalRevenue: Number(regStats.total_revenue),
      paidInFull: regStats.paid_in_full,
      regFeePaid: regStats.reg_fee_paid,
      unpaid: regStats.unpaid,
      checkedIn: regStats.checked_in,
      notCheckedIn: regStats.not_checked_in,
      tshirtCount: tshirtStats.count,
      pendingChanges: pendingStats.count,
      activeAnnouncements: annStats.count,
      feedbackCount: fbStats.count,
      avgRating: Number(fbStats.avg_rating),
    }

    recentRegistrations = await sql`
      SELECT 
        r.id,
        r.family_last_name,
        r.email,
        r.lodging_type,
        r.full_payment_paid,
        r.registration_fee_paid,
        r.checked_in,
        r.created_at,
        COUNT(fm.id)::int as attendee_count
      FROM registrations r
      LEFT JOIN family_members fm ON r.id = fm.registration_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
      LIMIT 5
    `

    recentCheckIns = await sql`
      SELECT id, family_last_name, checked_in_at
      FROM registrations
      WHERE checked_in = true AND checked_in_at IS NOT NULL
      ORDER BY checked_in_at DESC
      LIMIT 5
    `
  } catch (error) {
    console.error("[v0] Dashboard data fetch error:", error)
  }

  const checkInPercent = stats.totalRegistrations > 0
    ? Math.round((stats.checkedIn / stats.totalRegistrations) * 100)
    : 0

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNav currentPage="dashboard" admin={admin} />

      <main className="flex-1 bg-background p-6">
        <div className="container mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
            <p className="text-muted-foreground">Welcome back, {admin.fullName || admin.email}</p>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button asChild size="lg" className="h-auto flex-col gap-2 py-5">
              <Link href="/admin/checkin">
                <ScanLine className="h-7 w-7" />
                <span className="text-sm">Check-In Station</span>
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-5 bg-transparent">
              <Link href="/admin/registrations">
                <Users className="h-7 w-7" />
                <span className="text-sm">Registrations</span>
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-5 bg-transparent">
              <Link href="/admin/qr-codes">
                <QrCode className="h-7 w-7" />
                <span className="text-sm">Print QR Codes</span>
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-5 bg-transparent">
              <Link href="/admin/announcements">
                <Megaphone className="h-7 w-7" />
                <span className="text-sm">Announcements</span>
              </Link>
            </Button>
          </div>

          {/* Primary Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRegistrations}</div>
                <p className="text-xs text-muted-foreground">{stats.totalAttendees} total attendees</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Checked In</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.checkedIn} <span className="text-sm font-normal text-muted-foreground">/ {stats.totalRegistrations}</span></div>
                <p className="text-xs text-muted-foreground">{checkInPercent}% of families</p>
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
                <CardTitle className="text-sm font-medium">T-Shirts Ordered</CardTitle>
                <Shirt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.tshirtCount}</div>
                <p className="text-xs text-muted-foreground">All sizes combined</p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Payment Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Paid in Full</span>
                  <span className="font-bold">{stats.paidInFull}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-600">Reg Fee Only</span>
                  <span className="font-bold">{stats.regFeePaid}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">Unpaid</span>
                  <span className="font-bold">{stats.unpaid}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Action Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/admin/pending-changes" className="flex justify-between text-sm hover:underline">
                  <span className="flex items-center gap-1">
                    {stats.pendingChanges > 0 && <AlertCircle className="h-3 w-3 text-orange-600" />}
                    Pending Changes
                  </span>
                  <Badge variant={stats.pendingChanges > 0 ? "default" : "secondary"}>
                    {stats.pendingChanges}
                  </Badge>
                </Link>
                <Link href="/admin/announcements" className="flex justify-between text-sm hover:underline">
                  <span>Active Announcements</span>
                  <Badge variant="secondary">{stats.activeAnnouncements}</Badge>
                </Link>
                <Link href="/admin/checked-in" className="flex justify-between text-sm hover:underline">
                  <span>Not Checked In</span>
                  <Badge variant="outline">{stats.notCheckedIn}</Badge>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Submissions</span>
                  <Badge variant="secondary">{stats.feedbackCount}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Rating</span>
                  <span className="font-bold flex items-center gap-1">
                    {stats.avgRating > 0 ? (
                      <>
                        {stats.avgRating.toFixed(1)}
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                  <Link href="/admin/feedback">View All Feedback →</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Two Column: Recent Registrations & Recent Check-Ins */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Registrations
                </CardTitle>
                <CardDescription>Latest families who have registered</CardDescription>
              </CardHeader>
              <CardContent>
                {recentRegistrations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No registrations yet</p>
                ) : (
                  <div className="space-y-3">
                    {recentRegistrations.map((reg) => (
                      <div key={reg.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div className="space-y-0.5">
                          <p className="font-medium text-sm">{reg.family_last_name} Family</p>
                          <p className="text-xs text-muted-foreground">
                            {reg.attendee_count} attendees • {reg.lodging_type}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {reg.checked_in && (
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              <UserCheck className="h-3 w-3 mr-1" />
                              In
                            </Badge>
                          )}
                          {reg.full_payment_paid ? (
                            <Badge className="bg-green-50 text-green-700 hover:bg-green-50">Paid</Badge>
                          ) : reg.registration_fee_paid ? (
                            <Badge className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50">Reg</Badge>
                          ) : (
                            <Badge variant="destructive">Unpaid</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="outline" className="w-full mt-4 bg-transparent" asChild>
                  <Link href="/admin/registrations">View All Registrations</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-green-600" />
                  Recent Check-Ins
                </CardTitle>
                <CardDescription>Latest families to arrive on-site</CardDescription>
              </CardHeader>
              <CardContent>
                {recentCheckIns.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No check-ins yet</p>
                ) : (
                  <div className="space-y-3">
                    {recentCheckIns.map((reg) => (
                      <div key={reg.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div>
                          <p className="font-medium text-sm">{reg.family_last_name} Family</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(reg.checked_in_at).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          Checked In
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="outline" className="w-full mt-4 bg-transparent" asChild>
                  <Link href="/admin/checked-in">View All Check-Ins</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
