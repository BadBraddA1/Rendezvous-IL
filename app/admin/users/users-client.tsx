"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Shield, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  imageUrl: string
  role: "admin" | "editor" | "viewer" | "checkin" | null
  createdAt: number
  lastSignInAt: number | null
}

export function UsersClient() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  async function fetchUsers() {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/users")
      const data = await response.json()
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

      if (!response.ok) {
        throw new Error("Failed to update role")
      }

      // Update local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: role === "none" ? null : role as User["role"] } : u
      ))
      
      toast.success("Role updated successfully")
    } catch (error) {
      console.error("Error updating role:", error)
      toast.error("Failed to update role")
    } finally {
      setUpdating(null)
    }
  }

  function getRoleBadge(role: User["role"]) {
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
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    return email[0].toUpperCase()
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-section-title text-balance tracking-tight flex items-center gap-3">
            <Shield className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-lead text-muted-foreground mt-1">
            Manage admin roles and permissions for all users
          </p>
        </div>
        <Button variant="outline" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users ({users.length})
          </CardTitle>
          <CardDescription>
            Assign roles to control access to the admin dashboard. Only admins can change roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Last Sign In</TableHead>
                <TableHead className="text-right">Change Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
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
                            : user.email.split("@")[0]
                          }
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(user.role)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.lastSignInAt 
                      ? new Date(user.lastSignInAt).toLocaleDateString()
                      : "Never"
                    }
                  </TableCell>
                  <TableCell className="text-right">
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
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {users.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No users found
            </div>
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
                Full access to all features including user management, settings, and audit logs.
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Badge variant="secondary" className="mb-2">Editor</Badge>
              <p className="text-sm text-muted-foreground">
                Can view and edit registrations, approve pending changes, run check-in, and manage meals.
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Badge variant="secondary" className="mb-2">Check-In</Badge>
              <p className="text-sm text-muted-foreground">
                Check-in station only — web admin check-in, checked-in list, and the same flow in the iOS app.
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Badge variant="outline" className="mb-2">Viewer</Badge>
              <p className="text-sm text-muted-foreground">
                Read-only access to view registrations and dashboard statistics.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
