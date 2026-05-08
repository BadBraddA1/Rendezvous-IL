"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Key, Lock } from "lucide-react"
import { useSearchParams } from "next/navigation"

export default function AdminLoginPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
          <CardDescription>Use your secure admin URL to access the dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error === "failed" && (
            <Alert variant="destructive">
              <AlertDescription>Invalid or expired access link. Please use your secure admin URL.</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
              <Key className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Access Instructions</p>
                <p className="text-xs text-muted-foreground">
                  To access the admin dashboard, use the secure URL that was provided to you. This URL is unique and
                  should be bookmarked for future access.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
              <Lock className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Security Notice</p>
                <p className="text-xs text-muted-foreground">
                  Keep your admin URL private. Do not share it with anyone. Your session will remain active for 90 days.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border-2 border-dashed p-4 text-center">
            <p className="text-xs text-muted-foreground">
              If you need a new admin URL, contact the system administrator at{" "}
              <span className="font-medium">stephen@bradd.us</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
