type CacheEntry = {
  expiresAt: number
  promise: Promise<unknown>
}

const cache = new Map<string, CacheEntry>()

/** Dedupe identical GET requests within `ttlMs` (default 60s). */
export function fetchJsonCached<T>(url: string, ttlMs = 60_000): Promise<T> {
  const now = Date.now()
  const hit = cache.get(url)

  if (hit && hit.expiresAt > now) {
    return hit.promise as Promise<T>
  }

  const promise = fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
      }
      return response.json() as Promise<T>
    })
    .catch((error) => {
      cache.delete(url)
      throw error
    })

  cache.set(url, { expiresAt: now + ttlMs, promise })
  return promise as Promise<T>
}

export function invalidateFetchJsonCache(url?: string) {
  if (url) {
    cache.delete(url)
    return
  }
  cache.clear()
}
