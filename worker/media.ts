/**
 * R2 put/get/delete for Rendezvous IL media (directory photos, chat photos,
 * photoshow slides, song packs, static site files).
 *
 * Auth: x-upload-secret header must match UPLOAD_SECRET (wrangler secret).
 * Same arrangement as Pew Packers and the Exhibit Evangelism photo booth:
 * the Next app never holds R2 credentials, only this shared secret.
 */
interface Env {
  MEDIA: R2Bucket
  R2_PUBLIC_URL: string
  UPLOAD_SECRET: string
}

const MAX_BYTES = 20 * 1024 * 1024
const ALLOWED_PREFIXES = [
  "family-photos/",
  "chat-photos/",
  "photoshow/",
  "song-packs/",
  "site/",
  "Tshirts/",
]

function cacheControlFor(key: string): string {
  if (key.startsWith("song-packs/") || key.startsWith("site/")) {
    return "public, max-age=31536000, immutable"
  }
  // Photo keys are unique per upload, so a long TTL would keep a replaced
  // directory/chat photo visible after the family removes it.
  return "public, max-age=300"
}

function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 })
}

function cors(headers: HeadersInit = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-upload-secret",
    ...headers,
  }
}

function assertKey(key: string | null): string | Response {
  if (!key || !key.trim()) return badRequest("key is required")
  const k = key.trim().replace(/^\/+/, "")
  if (k.includes("..") || k.startsWith(".")) return badRequest("invalid key")
  if (!ALLOWED_PREFIXES.some((p) => k.startsWith(p))) {
    return badRequest(`key must be under ${ALLOWED_PREFIXES.join(" or ")}`)
  }
  return k
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors() })
    }

    if (url.pathname === "/health") {
      return Response.json({ ok: true }, { headers: cors() })
    }

    const secret = request.headers.get("x-upload-secret")
    if (!secret || secret !== env.UPLOAD_SECRET) {
      return unauthorized()
    }

    if (request.method === "PUT" && url.pathname === "/object") {
      const keyOrErr = assertKey(url.searchParams.get("key"))
      if (keyOrErr instanceof Response) return keyOrErr
      const key = keyOrErr

      const contentType =
        request.headers.get("content-type") || "application/octet-stream"
      const buf = await request.arrayBuffer()
      if (buf.byteLength === 0) return badRequest("empty body")
      if (buf.byteLength > MAX_BYTES) return badRequest("object too large")

      await env.MEDIA.put(key, buf, {
        httpMetadata: {
          contentType,
          cacheControl: cacheControlFor(key),
        },
      })

      const base = (env.R2_PUBLIC_URL || "").replace(/\/$/, "")
      return Response.json(
        {
          ok: true,
          key,
          publicUrl: base ? `${base}/${encodeURI(key)}` : null,
        },
        { headers: cors() },
      )
    }

    if (request.method === "GET" && url.pathname === "/object") {
      const keyOrErr = assertKey(url.searchParams.get("key"))
      if (keyOrErr instanceof Response) return keyOrErr
      const obj = await env.MEDIA.get(keyOrErr)
      if (!obj) return Response.json({ error: "Not found" }, { status: 404 })
      const headers = cors({
        "Content-Type":
          obj.httpMetadata?.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
      })
      return new Response(obj.body, { headers })
    }

    if (request.method === "DELETE" && url.pathname === "/object") {
      const keyOrErr = assertKey(url.searchParams.get("key"))
      if (keyOrErr instanceof Response) return keyOrErr
      await env.MEDIA.delete(keyOrErr)
      return Response.json({ ok: true }, { headers: cors() })
    }

    return Response.json({ error: "Not found" }, { status: 404 })
  },
}
