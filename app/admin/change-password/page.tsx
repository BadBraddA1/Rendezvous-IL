"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Lock } from "lucide-react"
import { MainContent } from "@/components/main-content"

export default function ChangePasswordPage() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to change password")
        setLoading(false)
        return
      }

      // Redirect to dashboard on success
      router.push("/admin")
    } catch (err) {
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <MainContent className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-6 w-6 text-blue-500" />
            <CardTitle className="text-2xl text-white">Change Password</CardTitle>
          </div>
          <CardDescription className="text-slate-400">You must change your password before continuing</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-slate-200">
                Current Password
              </Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="bg-slate-900/50 border-slate-700 text-white"
                placeholder="Enter current password (12345678)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-slate-200">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="bg-slate-900/50 border-slate-700 text-white"
                placeholder="Min. 8 characters"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-200">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="bg-slate-900/50 border-slate-700 text-white"
                placeholder="Re-enter new password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Changing Password..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </MainContent>
  )
}
