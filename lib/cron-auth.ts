/**
 * Vercel cron requests carry `Authorization: Bearer <CRON_SECRET>` when set.
 * Also accept `?secret=` for manual/debug triggers.
 * Without CRON_SECRET, allow Vercel's `x-vercel-cron` header or non-production.
 */
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  const url = new URL(req.url)
  if (secret) {
    const headerAuth = req.headers.get("authorization")
    if (headerAuth === `Bearer ${secret}`) return true
    if (url.searchParams.get("secret") === secret) return true
    return false
  }
  if (req.headers.get("x-vercel-cron")) return true
  return process.env.NODE_ENV !== "production"
}
