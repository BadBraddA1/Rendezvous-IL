"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { ArrowLeft, CheckCircle, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { clerkErrorMessage } from "@/lib/clerk-errors"

export function AccountSettingsClient() {
  const { isLoaded, user } = useUser()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState("")
  const [passwordMessage, setPasswordMessage] = useState("")
  const [profileError, setProfileError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  useEffect(() => {
    if (!user) return
    setFirstName(user.firstName ?? "")
    setLastName(user.lastName ?? "")
  }, [user])

  async function handleSaveProfile(event: React.FormEvent) {
    event.preventDefault()
    if (!user) return

    setProfileSaving(true)
    setProfileError("")
    setProfileMessage("")

    try {
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })
      setProfileMessage("Profile updated.")
    } catch (error) {
      setProfileError(clerkErrorMessage(error, "Could not update your profile."))
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleChangePassword(event: React.FormEvent) {
    event.preventDefault()
    if (!user) return

    setPasswordSaving(true)
    setPasswordError("")
    setPasswordMessage("")

    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
      })
      setCurrentPassword("")
      setNewPassword("")
      setPasswordMessage("Password updated.")
    } catch (error) {
      setPasswordError(clerkErrorMessage(error, "Could not update your password."))
    } finally {
      setPasswordSaving(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in required</CardTitle>
          <CardDescription>Sign in to manage your account settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/sign-in?redirect_url=/account/settings">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const email = user.primaryEmailAddress?.emailAddress

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/account">
          <Button variant="ghost" size="icon" aria-label="Back to account dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-section-title">Account settings</h1>
          <p className="text-lead text-muted-foreground">
            Update your sign-in name and password. Family details live on your family profile.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-widget-heading">Sign-in details</CardTitle>
          <CardDescription>Your email is used to match registration history.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account-email">Email</Label>
            <Input id="account-email" value={email ?? ""} disabled />
            <p className="text-xs text-muted-foreground">
              Email changes require verification. Contact support if you need to switch accounts.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-widget-heading">Display name</CardTitle>
          <CardDescription>Shown in your dashboard greeting and account menu.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {profileMessage && (
              <div className="flex items-center gap-2 rounded-md border border-success/30 bg-surface-highlight px-3 py-2 text-sm text-success">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {profileMessage}
              </div>
            )}
            {profileError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {profileError}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-first-name">First name</Label>
                <Input
                  id="settings-first-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-last-name">Last name</Label>
                <Input
                  id="settings-last-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={profileSaving}>
              {profileSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save name
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-widget-heading">Password</CardTitle>
          <CardDescription>
            If you signed in with Google, set a password here only if Clerk allows it for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordMessage && (
              <div className="flex items-center gap-2 rounded-md border border-success/30 bg-surface-highlight px-3 py-2 text-sm text-success">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {passwordMessage}
              </div>
            )}
            {passwordError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {passwordError}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={passwordSaving || !currentPassword || !newPassword}>
              {passwordSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            To update family contact info, members, or directory photo, use{" "}
            <Link href="/account/profile" className="font-medium text-primary hover:underline">
              Family profile
            </Link>
            . Changes there go through admin approval.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
