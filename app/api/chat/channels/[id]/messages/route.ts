import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { listChannelMessages, sendChannelMessage, clerkDisplayName } from "@/lib/chat/messages"
import { getCurrentAdmin } from "@/lib/clerk-auth"

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const { id: channelId } = await params
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get("cursor")
  const limit = Number(searchParams.get("limit") ?? 50)

  try {
    const user = await currentUser()
    const email = user?.emailAddresses?.[0]?.emailAddress
    const admin = await getCurrentAdmin()

    const result = await listChannelMessages(channelId, {
      clerkUserId: userId,
      email,
      isAdmin: Boolean(admin),
      cursor,
      limit,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[chat/messages] GET error:", error)
    const message = error instanceof Error ? error.message : "Failed to load messages"
    const status = message === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request, { params }: Params) {
  const { id: channelId } = await params
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const text = typeof body.body === "string" ? body.body : ""
    const isAnnouncement = Boolean(body.is_announcement)

    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 })
    }

    const admin = await getCurrentAdmin()
    if (isAnnouncement && !admin) {
      return NextResponse.json({ error: "Admin required for announcements" }, { status: 403 })
    }

    const message = await sendChannelMessage({
      channelId,
      body: text,
      clerkUserId: userId,
      email: user.emailAddresses?.[0]?.emailAddress,
      isAdmin: Boolean(admin),
      displayName: clerkDisplayName(user),
      avatarUrl: user.imageUrl,
      isAnnouncement,
    })

    return NextResponse.json({ message })
  } catch (error) {
    console.error("[chat/messages] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to send message"
    const status =
      message === "Forbidden" ? 403 : message.includes("required") || message.includes("long") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
