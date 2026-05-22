import { AdminNav } from "@/components/admin/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Users, DollarSign, ShieldX, LogIn, 
  Megaphone, Star, ClipboardCheck, AlertCircle, 
  Calendar, Home, Tent, Truck, Car,
  UserPlus, Calculator, Clock, CheckCircle2
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

  // Stats for 2027
  let stats2027 = {
    totalFamilies: 0,
    totalMembers: 0,
    expressRegistrations: 0,
    registrations: 0,
    registeredAttendees: 0,
    checkedIn: 0,
    totalRevenue: 0,
    depositsPaid: 0,
    fullyPaid: 0,
    balanceDue: 0,
    lodgingBreakdown: { motel: 0, rv: 0, tent: 0, drivein: 0 },
  }

  let actionItems = {
    pendingChanges: 0,
    activeAnnouncements: 0,
    feedbackCount: 0,
    avgRating: 0,
  }

  let returningFamilies = 0
  let newFamilies = 0

  try {
    // 2027 Registrations from registrations_v2
    const [regStats2027] = await sql`
      SELECT 
        COUNT(DISTINCT r.id)::int as total_registrations,
        COUNT(DISTINCT CASE WHEN r.checked_in = true THEN r.id END)::int as checked_in,
        COALESCE(SUM(r.total_cost), 0)::numeric as total_revenue,
        COALESCE(SUM(r.deposit_paid), 0)::numeric as deposits_paid,
        COUNT(DISTINCT CASE WHEN r.payment_status = 'paid' THEN r.id END)::int as fully_paid,
        COALESCE(SUM(r.balance_due), 0)::numeric as balance_due,
        COUNT(DISTINCT CASE WHEN r.lodging_type = 'motel' THEN r.id END)::int as motel,
        COUNT(DISTINCT CASE WHEN r.lodging_type = 'rv' THEN r.id END)::int as rv,
        COUNT(DISTINCT CASE WHEN r.lodging_type = 'tent' THEN r.id END)::int as tent,
        COUNT(DISTINCT CASE WHEN r.lodging_type = 'drivein' THEN r.id END)::int as drivein
      FROM registrations_v2 r
      WHERE r.event_year = 2027
    `

    // Count attendees for 2027 registrations
    const [attendeeStats] = await sql`
      SELECT COUNT(ra.id)::int as total_attendees
      FROM registration_attendees ra
      JOIN registrations_v2 r ON ra.registration_id = r.id
      WHERE r.event_year = 2027
    `

    // Total families in the system
    const [familyStats] = await sql`
      SELECT 
        COUNT(DISTINCT f.id)::int as total_families,
        COUNT(fm.id)::int as total_members
      FROM families f
      LEFT JOIN family_members_v2 fm ON f.id = fm.family_id
    `

    // Express registration count for 2027
    const [expressStats] = await sql`
      SELECT COUNT(*)::int as count FROM express_registration_2027
    `

    // Pending changes
    const [pendingStats] = await sql`
      SELECT COUNT(*)::int as count FROM pending_family_changes WHERE status = 'pending'
    `

    // Active announcements
    const [annStats] = await sql`
      SELECT COUNT(*)::int as count FROM announcements WHERE is_active = true
    `

    // Feedback (from event_feedback for 2027 or general feedback)
    const [fbStats] = await sql`
      SELECT 
        COUNT(*)::int as count,
        COALESCE(AVG(
          CASE overall_experience 
            WHEN 'excellent' THEN 5 
            WHEN 'good' THEN 4 
            WHEN 'average' THEN 3 
            WHEN 'poor' THEN 2 
            ELSE NULL 
          END
        ), 0)::numeric as avg_rating
      FROM event_feedback
      WHERE event_year = 2027
    `

    // Check how many 2027 families also had 2026 registrations (returning vs new)
    const [returningStats] = await sql`
      SELECT 
        COUNT(DISTINCT r2027.family_id)::int as returning_families
      FROM registrations_v2 r2027
      JOIN families f ON r2027.family_id = f.id
      WHERE r2027.event_year = 2027
      AND EXISTS (
        SELECT 1 FROM registrations r2026 
        WHERE LOWER(r2026.email) = LOWER(f.email)
      )
    `

    stats2027 = {
      totalFamilies: familyStats.total_families,
      totalMembers: familyStats.total_members,
      expressRegistrations: expressStats.count,
      registrations: regStats2027.total_registrations,
      registeredAttendees: attendeeStats.total_attendees,
      checkedIn: regStats2027.checked_in,
      totalRevenue: Number(regStats2027.total_revenue),
      depositsPaid: Number(regStats2027.deposits_paid),
      fullyPaid: regStats2027.fully_paid,
      balanceDue: Number(regStats2027.balance_due),
      lodgingBreakdown: {
        motel: regStats2027.motel,
        rv: regStats2027.rv,
        tent: regStats2027.tent,
        drivein: regStats2027.drivein,
      },
    }

    actionItems = {
      pendingChanges: pendingStats.count,
      activeAnnouncements: annStats.count,
      feedbackCount: fbStats.count,
      avgRating: Number(fbStats.avg_rating),
    }

    returningFamilies = returningStats.returning_families
    newFamilies = stats2027.registrations - returningFamilies

  } catch (error) {
    console.error("[v0] Dashboard data fetch error:", error)
  }

  const registrationGoal = 100 // Target registrations for 2027
  const registrationProgress = Math.min((stats2027.registrations / registrationGoal) * 100, 100)

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNav currentPage="dashboard" admin={admin} />

      <main className="flex-1 bg-background p-6">
        <div className="container mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-bold tracking-tight">Rendezvous 2027</h2>
                <Badge variant="outline" className="text-primary border-primary">
                  <Calendar className="h-3 w-3 mr-1" />
                  Planning Phase
                </Badge>
              </div>
              <p className="text-muted-foreground">Welcome back, {admin.fullName || admin.email}</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/calculator">
                  <Calculator className="h-4 w-4 mr-2" />
                  Test Rates
                </Link>
              </Button>
              <Button asChild>
                <Link href="/admin/rates">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Manage Rates
                </Link>
              </Button>
            </div>
          </div>

          {/* Registration Progress */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">2027 Registration Progress</CardTitle>
                <span className="text-2xl font-bold">{stats2027.registrations} / {registrationGoal}</span>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={registrationProgress} className="h-3" />
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>{Math.round(registrationProgress)}% of goal</span>
                <span>{registrationGoal - stats2027.registrations} spots remaining</span>
              </div>
            </CardContent>
          </Card>

          {/* Primary Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Registered Families</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats2027.registrations}</div>
                <p className="text-xs text-muted-foreground">
                  {stats2027.registeredAttendees} total attendees
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Express Pre-Registrations</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats2027.expressRegistrations}</div>
                <p className="text-xs text-muted-foreground">
                  Families planning to attend
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats2027.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  ${stats2027.balanceDue.toLocaleString()} balance due
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Family Database</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats2027.totalFamilies}</div>
                <p className="text-xs text-muted-foreground">
                  {stats2027.totalMembers} total members
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Two Column Layout */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Lodging Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lodging Distribution</CardTitle>
                <CardDescription>2027 registration breakdown by lodging type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-blue-600" />
                    <span>Motel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{stats2027.lodgingBreakdown.motel}</span>
                    {stats2027.registrations > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {Math.round((stats2027.lodgingBreakdown.motel / stats2027.registrations) * 100)}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-green-600" />
                    <span>RV</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{stats2027.lodgingBreakdown.rv}</span>
                    {stats2027.registrations > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {Math.round((stats2027.lodgingBreakdown.rv / stats2027.registrations) * 100)}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tent className="h-4 w-4 text-orange-600" />
                    <span>Tent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{stats2027.lodgingBreakdown.tent}</span>
                    {stats2027.registrations > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {Math.round((stats2027.lodgingBreakdown.tent / stats2027.registrations) * 100)}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-purple-600" />
                    <span>Drive-In</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{stats2027.lodgingBreakdown.drivein}</span>
                    {stats2027.registrations > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {Math.round((stats2027.lodgingBreakdown.drivein / stats2027.registrations) * 100)}%
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Status</CardTitle>
                <CardDescription>2027 payment collection progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Paid in Full</span>
                  </div>
                  <span className="font-bold">{stats2027.fullyPaid}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span>Deposit Only</span>
                  </div>
                  <span className="font-bold">{stats2027.registrations - stats2027.fullyPaid}</span>
                </div>
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deposits Collected</span>
                    <span className="font-medium">${stats2027.depositsPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance Remaining</span>
                    <span className="font-medium text-orange-600">${stats2027.balanceDue.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Action Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/admin/pending-changes" className="flex justify-between items-center text-sm hover:bg-muted/50 p-2 rounded-md -mx-2">
                  <span className="flex items-center gap-2">
                    {actionItems.pendingChanges > 0 && <AlertCircle className="h-4 w-4 text-orange-600" />}
                    Pending Family Changes
                  </span>
                  <Badge variant={actionItems.pendingChanges > 0 ? "default" : "secondary"}>
                    {actionItems.pendingChanges}
                  </Badge>
                </Link>
                <Link href="/admin/announcements" className="flex justify-between items-center text-sm hover:bg-muted/50 p-2 rounded-md -mx-2">
                  <span className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-muted-foreground" />
                    Active Announcements
                  </span>
                  <Badge variant="secondary">{actionItems.activeAnnouncements}</Badge>
                </Link>
                <Link href="/admin/feedback" className="flex justify-between items-center text-sm hover:bg-muted/50 p-2 rounded-md -mx-2">
                  <span className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    2027 Feedback
                  </span>
                  <Badge variant="secondary">{actionItems.feedbackCount}</Badge>
                </Link>
              </CardContent>
            </Card>

            {/* Family Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Family Insights</CardTitle>
                <CardDescription>Returning vs new families for 2027</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Returning Families</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{returningFamilies}</span>
                    {stats2027.registrations > 0 && (
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        {Math.round((returningFamilies / stats2027.registrations) * 100)}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>New Families</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{newFamilies}</span>
                    {stats2027.registrations > 0 && (
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        {Math.round((newFamilies / stats2027.registrations) * 100)}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    {stats2027.expressRegistrations > 0 
                      ? `${stats2027.expressRegistrations} families have saved their preferences for express registration.`
                      : "No express registrations yet. Share the calculator to let families plan ahead!"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/admin/registrations">
                    <Users className="h-4 w-4 mr-2" />
                    View All Registrations
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/admin/announcements">
                    <Megaphone className="h-4 w-4 mr-2" />
                    Post Announcement
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/admin/meals">
                    <Calendar className="h-4 w-4 mr-2" />
                    Manage Meals
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/admin/feedback">
                    <Star className="h-4 w-4 mr-2" />
                    View Feedback
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
