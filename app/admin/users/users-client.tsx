"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Users,
  Shield,
  Loader2,
  RefreshCw,
  Plus,
  MoreHorizontal,
  KeyRound,
  Ban,
  Trash2,
  Smartphone,
  Globe,
  MonitorSmartphone,
} from "lucide-react"
import { toast } from "sonner"

type UserRole = "admin" | "editor" | "viewer" | "checkin" | null
type UserPlatform = "web" | "ios" | "android" | null

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  imageUrl: string
  role: UserRole
  createdAt: number
  lastSignInAt: number | null
  lastActiveAt: number | null
  banned: boolean
  locked: boolean
  lastSeenAt: string | null
  lastPlatform: UserPlatform
  lastAppVersion: string | null
  visitCount: number
}

function formatWhen(value: number | string | null) {
  if (!value) return "Never"
  const date = typeof value === "number" ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return "Never"
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function bestLastSeen(user: User) {
  const timestamps: number[] = []
  if (user.lastSeenAt) timestamps.push(new Date(user.lastSeenAt).getTime())
  if (user.lastActiveAt) timestamps.push(user.lastActiveAt)
  if (user.lastSignInAt) timestamps.push(user.lastSignInAt)
  if (timestamps.length === 0) return null
  return Math.max(...timestamps)
}

function platformBadge(platform: UserPlatform) {
  if (!platform) return <Badge variant="outline">Unknown</Badge>
  const labels = {
    web: { label: "Web", icon: Globe },
    ios: { label: "iOS app", icon: Smartphone },
    android: { label: "Android", icon: MonitorSmartphone },
  } as const
  const config = labels[platform]
  const Icon = config.icon
  return (
    <Badge variant="secondary" className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

export function UsersClient() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [resetUser, setResetUser] = useState<User | null>(null)
  const [resetPassword, setResetPassword] = useState("")
  const [resetLink, setResetLink] = useState("")
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "none",
    password: "",
  })

  async function fetchUsers() {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/users")
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to load users")
      setUsers(data.users || [])
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  async function updateRole(userId: string, role: string | null) {
    setUpdating(userId)
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: role === "none" ? null : role }),
      })
      if (!response.ok) throw new Error("Failed to update role")
      const data = await response.json()
      setUsers((current) => current.map((user) => (user.id === userId ? data.user : user)))
      toast.success("Role updated")
    } catch (error) {
      console.error("Error updating role:", error)
      toast.error("Failed to update role")
    } finally {
      setUpdating(null)
    }
  }

  async function toggleBan(user: User) {
    setUpdating(user.id)
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, banned: !user.banned }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update ban status")
      }
      const data = await response.json()
      setUsers((current) => current.map((entry) => (entry.id === user.id ? data.user : entry)))
      toast.success(user.banned ? "User unbanned" : "User banned")
    } catch (error) {
      console.error("Error updating ban status:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update ban status")
    } finally {
      setUpdating(null)
    }
  }

  async function handleCreateUser(event: React.FormEvent) {
    event.preventDefault()
    setCreating(true)
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUser.email,
          firstName: newUser.firstName || undefined,
          lastName: newUser.lastName || undefined,
          role: newUser.role === "none" ? null : newUser.role,
          password: newUser.password || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to create user")
      setUsers((current) => [data.user, ...current])
      setCreateOpen(false)
      setNewUser({ email: "", firstName: "", lastName: "", role: "none", password: "" })
      toast.success("User created")
    } catch (error) {
      console.error("Error creating user:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create user")
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteUser() {
    if (!deleteUser) return
    setUpdating(deleteUser.id)
    try {
      const response = await fetch(`/api/admin/users/${deleteUser.id}`, { method: "DELETE" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to delete user")
      setUsers((current) => current.filter((user) => user.id !== deleteUser.id))
      toast.success("User deleted")
    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete user")
    } finally {
      setUpdating(null)
      setDeleteUser(null)
    }
  }

  async function handleResetPassword(mode: "set" | "link") {
    if (!resetUser) return
    setUpdating(resetUser.id)
    setResetLink("")
    try {
      const response = await fetch(`/api/admin/users/${resetUser.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "set"
            ? { mode: "set", password: resetPassword }
            : { mode: "link" },
        ),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to reset password")

      if (mode === "set") {
        toast.success("Password updated")
        setResetUser(null)
        setResetPassword("")
      } else if (data.url) {
        setResetLink(data.url)
        await navigator.clipboard.writeText(data.url)
        toast.success("Sign-in link copied to clipboard")
      }
    } catch (error) {
      console.error("Error resetting password:", error)
      toast.error(error instanceof Error ? error.message : "Failed to reset password")
    } finally {
      setUpdating(null)
    }
  }

  function getRoleBadge(role: UserRole) {
    if (!role) return <Badge variant="outline">No Role</Badge>
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      admin: "default",
      editor: "secondary",
      checkin: "secondary",
      viewer: "outline",
    }
    return <Badge variant={variants[role]}>{role.charAt(0).toUpperCase() + role.slice(1)}</Badge>
  }

  function getInitials(firstName: string | null, lastName: string | null, email: string) {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
    return email[0]?.toUpperCase() ?? "?"
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-section-title text-balance tracking-tight flex items-center gap-3">
            <Shield className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-lead text-muted-foreground mt-1">
            Create accounts, assign roles, track last activity, and manage passwords.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add user
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create user</DialogTitle>
                <DialogDescription>
                  Creates a Clerk account. Leave password blank to email an invite / password setup link.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="create-email">Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(event) => setNewUser({ ...newUser, email: event.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="create-first">First name</Label>
                    <Input
                      id="create-first"
                      value={newUser.firstName}
                      onChange={(event) => setNewUser({ ...newUser, firstName: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-last">Last name</Label>
                    <Input
                      id="create-last"
                      value={newUser.lastName}
                      onChange={(event) => setNewUser({ ...newUser, lastName: event.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Admin role</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No admin role</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="checkin">Check-In</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-password">Temporary password (optional)</Label>
                  <Input
                    id="create-password"
                    type="password"
                    minLength={8}
                    value={newUser.password}
                    onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={creating}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create user"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users ({users.length})
          </CardTitle>
          <CardDescription>
            Last seen uses app/site pings (web + iOS). Clerk sign-in times are shown when available.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead className="hidden lg:table-cell">App</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.imageUrl} alt={user.email} />
                        <AvatarFallback>
                          {getInitials(user.firstName, user.lastName, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.email.split("@")[0]}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role || "none"}
                      onValueChange={(value) => updateRole(user.id, value)}
                      disabled={updating === user.id}
                    >
                      <SelectTrigger className="w-32">
                        {updating === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Role</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="checkin">Check-In</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    <div>{formatWhen(bestLastSeen(user))}</div>
                    {user.visitCount > 0 && (
                      <div className="text-xs">{user.visitCount} visits</div>
                    )}
                  </TableCell>
                  <TableCell>{platformBadge(user.lastPlatform)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                    {user.lastAppVersion || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getRoleBadge(user.role)}
                      {user.banned && <Badge variant="destructive">Banned</Badge>}
                      {user.locked && <Badge variant="outline">Locked</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${user.email}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setResetUser(user); setResetPassword(""); setResetLink("") }}>
                          <KeyRound className="h-4 w-4 mr-2" />
                          Reset password
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleBan(user)}>
                          <Ban className="h-4 w-4 mr-2" />
                          {user.banned ? "Unban user" : "Ban user"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {users.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No users found</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-lg border bg-card">
              <Badge variant="default" className="mb-2">Admin</Badge>
              <p className="text-sm text-muted-foreground">
                Full access including user management, settings, and audit logs.
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Badge variant="secondary" className="mb-2">Editor</Badge>
              <p className="text-sm text-muted-foreground">
                Edit registrations, approve pending changes, run check-in, and manage meals.
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Badge variant="secondary" className="mb-2">Check-In</Badge>
              <p className="text-sm text-muted-foreground">
                Check-in station only — web admin check-in and the iOS app.
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Badge variant="outline" className="mb-2">Viewer</Badge>
              <p className="text-sm text-muted-foreground">
                Read-only access to registrations and dashboard statistics.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteUser?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the Clerk account. Family links are cleared automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!resetUser} onOpenChange={(open) => !open && setResetUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a temporary password for {resetUser?.email}, or generate a one-time sign-in link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-new-password">New password</Label>
              <Input
                id="admin-new-password"
                type="password"
                minLength={8}
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!resetPassword || updating === resetUser?.id}
                onClick={() => handleResetPassword("set")}
              >
                Set password
              </Button>
              <Button
                variant="outline"
                disabled={updating === resetUser?.id}
                onClick={() => handleResetPassword("link")}
              >
                Copy sign-in link
              </Button>
            </div>
            {resetLink && (
              <p className="text-xs break-all rounded-md border bg-muted/40 p-2 text-muted-foreground">
                {resetLink}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Users can also reset their own password at{" "}
              <a href="/sign-in/forgot-password" className="text-primary hover:underline">
                /sign-in/forgot-password
              </a>
              .
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
