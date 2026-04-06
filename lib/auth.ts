import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { sql } from "./db"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

export interface AdminSession {
  email: string
  role: string
  fullName?: string
}

export async function hashPassword(password: string): Promise<string> {
  // Using Web Crypto API for password hashing (bcrypt alternative for edge)
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

export async function createSession(admin: AdminSession): Promise<string> {
  const token = await new SignJWT({
    email: admin.email,
    role: admin.role,
    fullName: admin.fullName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(JWT_SECRET)

  return token
}

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_session")?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as AdminSession
  } catch (error) {
    return null
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete("admin_session")
}

export async function logAuditAction(
  adminEmail: string,
  action: string,
  resourceType?: string,
  resourceId?: number,
  details?: any,
  request?: Request,
) {
  const ipAddress = request?.headers.get("x-forwarded-for") || request?.headers.get("x-real-ip") || "unknown"
  const userAgent = request?.headers.get("user-agent") || "unknown"

  await sql`
    INSERT INTO audit_logs (admin_email, action, resource_type, resource_id, details, ip_address, user_agent)
    VALUES (${adminEmail}, ${action}, ${resourceType || null}, ${resourceId || null}, ${JSON.stringify(details) || null}, ${ipAddress}, ${userAgent})
  `
}
