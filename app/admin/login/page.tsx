import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { getAdminRole } from "@/lib/clerk-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, AlertCircle } from "lucide-react"
import Link from "next/link"
import { MainContent } from "@/components/main-content"

export const metadata = {
  title: "Admin Login - Rendezvous IL",
  description: "Sign in to access the Rendezvous IL admin dashboard.",
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const { userId } = await auth()

  // If user is signed in, check if they're an admin
  if (userId) {
    const role = await getAdminRole()

    if (role) {
      // User is an admin, redirect to dashboard
      redirect("/admin")
    }

    // User is signed in but not an admin
    return (
      <MainContent className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
            <CardDescription>
              Your account does not have admin privileges.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              If you believe you should have admin access, please contact the system administrator to have your account upgraded.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/">Return to Home</Link>
              </Button>
              <Button variant="outline" asChild className="bg-transparent">
                <Link href="/account">Go to My Account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </MainContent>
    )
  }

  // User is not signed in
  return (
    <MainContent className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
          <CardDescription>
            Sign in with your admin account to access the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error === "unauthorized" && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              You must have admin privileges to access this area.
            </div>
          )}
          <Button asChild className="w-full">
            <Link href="/sign-in?redirect_url=/admin">
              Sign In to Continue
            </Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Only authorized administrators can access this area.
          </p>
        </CardContent>
      </Card>
    </MainContent>
  )
}
