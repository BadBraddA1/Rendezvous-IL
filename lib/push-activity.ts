/**
 * Short-lived push ops log (Turso, ~24h).
 * Summary row per outbound send; per-device rows only on failure.
 * Inbound: token register / unregister.
 */

import { randomUUID } from "crypto"
import { sql } from "@/lib/db"
import { ensurePushSchema } from "@/lib/push-schema"

let activitySchemaEnsured = false

export type PushActivitySource =
  | "chat"
  | "chat_reaction"
  | "broadcast"
  | "register"
  | "unregister"
  | "push_test"
  | "other"

export type PushActivityKind = "summary" | "failure" | "register" | "unregister"

export type PushPlatform = "ios" | "android" | "both" | "unknown"

export type PushDeliveryStatus = "ok" | "fail" | "partial" | "skipped"

export type PushFailureDetail = {
  platform: "ios" | "android"
  environment?: "sandbox" | "production" | null
  clerkUserId?: string | null
  token: string
  reason?: string | null
  statusCode?: number | null
}

export type PushSendSummaryInput = {
  source: PushActivitySource
  title?: string | null
  bodyPreview?: string | null
  channelId?: string | null
  messageId?: string | null
  /** Recipients considered for this send (clerk ids), before token lookup. */
  recipientCount?: number
  iosAttempted: number
  iosSucceeded: number
  iosFailed: number
  androidAttempted: number
  androidSucceeded: number
  androidFailed: number
  sandboxTokens?: number
  productionTokens?: number
  failures?: PushFailureDetail[]
  /** Extra small JSON-safe bag (no tokens / secrets). */
  meta?: Record<string, unknown>
}

export type PushActivityRow = {
  id: string
  batch_id: string
  created_at: string
  direction: "in" | "out"
  kind: PushActivityKind
  source: string
  platform: string | null
  environment: string | null
  clerk_user_id: string | null
  token_prefix: string | null
  channel_id: string | null
  message_id: string | null
  title: string | null
  body_preview: string | null
  status: string | null
  reason: string | null
  attempted: number | null
  succeeded: number | null
  failed: number | null
  sandbox_count: number | null
  production_count: number | null
  meta_json: string | null
}

const RETENTION_HOURS = 24

export function tokenPrefix(token: string | null | undefined): string | null {
  if (!token) return null
  const t = token.trim()
  if (!t) return null
  return t.slice(0, 12)
}

export async function ensurePushActivitySchema(): Promise<void> {
  await ensurePushSchema()
  if (activitySchemaEnsured) return

  await sql.query(`
    CREATE TABLE IF NOT EXISTS push_events (
      id TEXT PRIMARY KEY NOT NULL,
      batch_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      direction TEXT NOT NULL,
      kind TEXT NOT NULL,
      source TEXT NOT NULL,
      platform TEXT,
      environment TEXT,
      clerk_user_id TEXT,
      token_prefix TEXT,
      channel_id TEXT,
      message_id TEXT,
      title TEXT,
      body_preview TEXT,
      status TEXT,
      reason TEXT,
      attempted INTEGER,
      succeeded INTEGER,
      failed INTEGER,
      sandbox_count INTEGER,
      production_count INTEGER,
      meta_json TEXT
    )
  `)

  await sql.query(
    `CREATE INDEX IF NOT EXISTS idx_push_events_created ON push_events (created_at)`,
  )
  await sql.query(
    `CREATE INDEX IF NOT EXISTS idx_push_events_batch ON push_events (batch_id)`,
  )
  await sql.query(
    `CREATE INDEX IF NOT EXISTS idx_push_events_kind ON push_events (kind)`,
  )

  activitySchemaEnsured = true
}

function deliveryStatus(succeeded: number, failed: number, attempted: number): PushDeliveryStatus {
  if (attempted === 0) return "skipped"
  if (failed === 0) return "ok"
  if (succeeded === 0) return "fail"
  return "partial"
}

/** Best-effort — never throws into the push path. */
export async function logPushSend(input: PushSendSummaryInput): Promise<string | null> {
  try {
    await ensurePushActivitySchema()
    const batchId = randomUUID()
    const now = new Date().toISOString()
    const attempted = input.iosAttempted + input.androidAttempted
    const succeeded = input.iosSucceeded + input.androidSucceeded
    const failed = input.iosFailed + input.androidFailed
    const status = deliveryStatus(succeeded, failed, attempted)
    const platform: PushPlatform =
      input.iosAttempted > 0 && input.androidAttempted > 0
        ? "both"
        : input.iosAttempted > 0
          ? "ios"
          : input.androidAttempted > 0
            ? "android"
            : "unknown"

    const meta = {
      ...(input.meta ?? {}),
      recipientCount: input.recipientCount ?? null,
      ios: {
        attempted: input.iosAttempted,
        succeeded: input.iosSucceeded,
        failed: input.iosFailed,
      },
      android: {
        attempted: input.androidAttempted,
        succeeded: input.androidSucceeded,
        failed: input.androidFailed,
      },
    }

    await sql`
      INSERT INTO push_events (
        id, batch_id, created_at, direction, kind, source, platform, environment,
        clerk_user_id, token_prefix, channel_id, message_id, title, body_preview,
        status, reason, attempted, succeeded, failed, sandbox_count, production_count, meta_json
      ) VALUES (
        ${randomUUID()},
        ${batchId},
        ${now},
        ${"out"},
        ${"summary"},
        ${input.source},
        ${platform},
        ${null},
        ${null},
        ${null},
        ${input.channelId ?? null},
        ${input.messageId ?? null},
        ${(input.title ?? "").slice(0, 120) || null},
        ${(input.bodyPreview ?? "").slice(0, 160) || null},
        ${status},
        ${null},
        ${attempted},
        ${succeeded},
        ${failed},
        ${input.sandboxTokens ?? null},
        ${input.productionTokens ?? null},
        ${JSON.stringify(meta)}
      )
    `

    const failures = input.failures ?? []
    for (const f of failures) {
      await sql`
        INSERT INTO push_events (
          id, batch_id, created_at, direction, kind, source, platform, environment,
          clerk_user_id, token_prefix, channel_id, message_id, title, body_preview,
          status, reason, attempted, succeeded, failed, sandbox_count, production_count, meta_json
        ) VALUES (
          ${randomUUID()},
          ${batchId},
          ${now},
          ${"out"},
          ${"failure"},
          ${input.source},
          ${f.platform},
          ${f.environment ?? null},
          ${f.clerkUserId ?? null},
          ${tokenPrefix(f.token)},
          ${input.channelId ?? null},
          ${input.messageId ?? null},
          ${null},
          ${null},
          ${"fail"},
          ${(f.reason ?? "").slice(0, 240) || null},
          ${1},
          ${0},
          ${1},
          ${null},
          ${null},
          ${f.statusCode != null ? JSON.stringify({ statusCode: f.statusCode }) : null}
        )
      `
    }

    return batchId
  } catch (error) {
    console.error("[push-activity] logPushSend failed:", error)
    return null
  }
}

export async function logPushRegister(input: {
  platform: "ios" | "android"
  token: string
  clerkUserId?: string | null
  environment?: string | null
  ok: boolean
  reason?: string | null
}): Promise<void> {
  try {
    await ensurePushActivitySchema()
    const now = new Date().toISOString()
    await sql`
      INSERT INTO push_events (
        id, batch_id, created_at, direction, kind, source, platform, environment,
        clerk_user_id, token_prefix, channel_id, message_id, title, body_preview,
        status, reason, attempted, succeeded, failed, sandbox_count, production_count, meta_json
      ) VALUES (
        ${randomUUID()},
        ${randomUUID()},
        ${now},
        ${"in"},
        ${"register"},
        ${"register"},
        ${input.platform},
        ${input.environment ?? null},
        ${input.clerkUserId ?? null},
        ${tokenPrefix(input.token)},
        ${null},
        ${null},
        ${null},
        ${null},
        ${input.ok ? "ok" : "fail"},
        ${(input.reason ?? "").slice(0, 240) || null},
        ${1},
        ${input.ok ? 1 : 0},
        ${input.ok ? 0 : 1},
        ${null},
        ${null},
        ${null}
      )
    `
  } catch (error) {
    console.error("[push-activity] logPushRegister failed:", error)
  }
}

export async function logPushUnregister(input: {
  platform: "ios" | "android"
  token: string
  ok: boolean
  reason?: string | null
}): Promise<void> {
  try {
    await ensurePushActivitySchema()
    const now = new Date().toISOString()
    await sql`
      INSERT INTO push_events (
        id, batch_id, created_at, direction, kind, source, platform, environment,
        clerk_user_id, token_prefix, channel_id, message_id, title, body_preview,
        status, reason, attempted, succeeded, failed, sandbox_count, production_count, meta_json
      ) VALUES (
        ${randomUUID()},
        ${randomUUID()},
        ${now},
        ${"in"},
        ${"unregister"},
        ${"unregister"},
        ${input.platform},
        ${null},
        ${null},
        ${tokenPrefix(input.token)},
        ${null},
        ${null},
        ${null},
        ${null},
        ${input.ok ? "ok" : "fail"},
        ${(input.reason ?? "").slice(0, 240) || null},
        ${1},
        ${input.ok ? 1 : 0},
        ${input.ok ? 0 : 1},
        ${null},
        ${null},
        ${null}
      )
    `
  } catch (error) {
    console.error("[push-activity] logPushUnregister failed:", error)
  }
}

/** Delete rows older than 24 hours. Safe to call often. */
export async function prunePushEvents(): Promise<{ deleted: number }> {
  await ensurePushActivitySchema()
  const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000).toISOString()
  const [pending] = await sql`
    SELECT COUNT(*) AS n FROM push_events WHERE created_at < ${cutoff}
  `
  const deleted = Number(pending?.n ?? 0)
  if (deleted > 0) {
    await sql`DELETE FROM push_events WHERE created_at < ${cutoff}`
  }
  return { deleted }
}

export async function listPushActivity(input?: {
  limit?: number
  kind?: PushActivityKind | "all"
  source?: string
  status?: string
}): Promise<PushActivityRow[]> {
  await ensurePushActivitySchema()
  const limit = Math.min(Math.max(input?.limit ?? 100, 1), 300)
  const kind = input?.kind && input.kind !== "all" ? input.kind : null
  const source = input?.source && input.source !== "all" ? input.source : null
  const status = input?.status && input.status !== "all" ? input.status : null

  const rows = await sql.query(
    `SELECT * FROM push_events
     WHERE (? IS NULL OR kind = ?)
       AND (? IS NULL OR source = ?)
       AND (? IS NULL OR status = ?)
     ORDER BY created_at DESC
     LIMIT ?`,
    [kind, kind, source, source, status, status, limit],
  )

  return rows.map((r) => ({
    id: String(r.id),
    batch_id: String(r.batch_id),
    created_at: String(r.created_at),
    direction: r.direction === "in" ? "in" : "out",
    kind: String(r.kind) as PushActivityKind,
    source: String(r.source),
    platform: r.platform != null ? String(r.platform) : null,
    environment: r.environment != null ? String(r.environment) : null,
    clerk_user_id: r.clerk_user_id != null ? String(r.clerk_user_id) : null,
    token_prefix: r.token_prefix != null ? String(r.token_prefix) : null,
    channel_id: r.channel_id != null ? String(r.channel_id) : null,
    message_id: r.message_id != null ? String(r.message_id) : null,
    title: r.title != null ? String(r.title) : null,
    body_preview: r.body_preview != null ? String(r.body_preview) : null,
    status: r.status != null ? String(r.status) : null,
    reason: r.reason != null ? String(r.reason) : null,
    attempted: r.attempted != null ? Number(r.attempted) : null,
    succeeded: r.succeeded != null ? Number(r.succeeded) : null,
    failed: r.failed != null ? Number(r.failed) : null,
    sandbox_count: r.sandbox_count != null ? Number(r.sandbox_count) : null,
    production_count: r.production_count != null ? Number(r.production_count) : null,
    meta_json: r.meta_json != null ? String(r.meta_json) : null,
  }))
}
