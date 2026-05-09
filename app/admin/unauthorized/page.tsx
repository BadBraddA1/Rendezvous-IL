import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldX, Home, ArrowLeft } from "lucide-react"
import { currentUser } from "@clerk/nextjs/server"

export default async function UnauthorizedPage() {
  const user = await currentUser()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription className="text-base">
            You don&apos;t have permission to access the admin area.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user && (
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">Signed in as:</p>
              <p className="font-medium">{user.emailAddresses[0]?.emailAddress}</p>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground text-center">
            If you believe you should have admin access, please contact your administrator to have your account upgraded.
          </p>

          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go to Homepage
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/account">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to My Account
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
