// Lazy Resend client.
//
// Constructing `new Resend(undefined)` throws "Missing API key", which breaks
// `next build` when env vars aren't loaded during route data collection.
// This proxy defers construction until a method is actually invoked at runtime.

import { Resend } from "resend"

let _client: Resend | null = null

function getClient(): Resend {
  if (_client) return _client
  const apiKey = process.env.Resend_API || process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error(
      "Resend API key is not set. Add Resend_API to your environment variables.",
    )
  }
  _client = new Resend(apiKey)
  return _client
}

// Proxy preserves the same `resend.emails.send(...)` call shape used throughout
// the codebase, so importing files don't need any changes.
export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    const client = getClient() as unknown as Record<string | symbol, unknown>
    return client[prop as string]
  },
})
