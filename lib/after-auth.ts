/**
 * Shared `finalize({ navigate })` handler for Clerk Core 3 flows.
 * Session tasks pause navigation (Clerk renders its own task UI);
 * decorated URLs may be absolute (Safari ITP), which need a full navigation.
 */
/**
 * `errors.global` changed shape across @clerk/nextjs v7 minors
 * (array of ClerkError → single ClerkError | null). Normalize to one-or-null.
 */
export function globalAuthError(errors: {
  global: unknown
}): { message: string; longMessage?: string } | null {
  const g = errors.global as
    | { message: string; longMessage?: string }
    | { message: string; longMessage?: string }[]
    | null
    | undefined
  if (!g) return null
  return Array.isArray(g) ? (g[0] ?? null) : g
}

export function afterAuth(
  push: (url: string) => void,
  destination: string,
) {
  return async ({
    session,
    decorateUrl,
  }: {
    session: { currentTask?: unknown } | null | undefined
    decorateUrl: (url: string) => string
  }) => {
    if (session?.currentTask) return

    const url = decorateUrl(destination)
    if (url.startsWith("http")) {
      window.location.href = url
    } else {
      push(url)
    }
  }
}
