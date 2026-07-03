import { NextResponse } from "next/server"
import { clerkClient, type User } from "@clerk/nextjs/server"
import { checkAdminAuth } from "@/lib/admin-auth"

function displayName(user: User): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
  if (name) return name
  return user.emailAddresses[0]?.emailAddress || user.id
}

/** List all Clerk accounts for chat member pickers (any admin role). */
export async function GET() {
  const admin = await checkAdminAuth()
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  try {
    const clerk = await clerkClient()
    const people: {
      id: string
      displayName: string
      email: string
      imageUrl: string
    }[] = []

    let offset = 0
    const limit = 100
    while (true) {
      const page = await clerk.users.getUserList({
        limit,
        offset,
        orderBy: "-created_at",
      })
      for (const user of page.data) {
        if (user.banned) continue
        people.push({
          id: user.id,
          displayName: displayName(user),
          email: user.emailAddresses[0]?.emailAddress || "",
          imageUrl: user.imageUrl,
        })
      }
      if (page.data.length < limit) break
      offset += limit
      if (offset > 2000) break
    }

    people.sort((a, b) => a.displayName.localeCompare(b.displayName))
    return NextResponse.json({ people })
  } catch (error) {
    console.error("[admin/chat/people] GET error:", error)
    return NextResponse.json({ error: "Failed to load people" }, { status: 500 })
  }
}
