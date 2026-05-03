import { neon } from "@neondatabase/serverless"

// Lazy-initialize the neon client so importing this module never throws,
// even if environment variables aren't available (e.g. during `next build`
// route data collection or in environments where envs load after import).
type NeonClient = ReturnType<typeof neon>
let _client: NeonClient | null = null

function getClient(): NeonClient {
  if (_client) return _client
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      "Database connection string is not set. Configure NEON_DATABASE_URL (or DATABASE_URL) in your environment.",
    )
  }
  _client = neon(url)
  return _client
}

// Export a Proxy that behaves identically to a neon `sql` client. It works as a
// tagged template (`sql\`SELECT ...\``), and also forwards property access for
// helpers like `sql.transaction(...)`. The real client is only constructed on
// first use, after env vars are guaranteed to be available.
export const sql = new Proxy(function () {} as unknown as NeonClient, {
  apply(_target, _thisArg, args: unknown[]) {
    // @ts-expect-error - tagged-template invocation
    return getClient()(...args)
  },
  get(_target, prop: string | symbol) {
    const client = getClient() as unknown as Record<string | symbol, unknown>
    const value = client[prop]
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value
  },
}) as NeonClient
