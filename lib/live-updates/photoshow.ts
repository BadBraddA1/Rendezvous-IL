import { randomUUID } from "crypto"
import { del, put } from "@vercel/blob"
import { sql } from "@/lib/db"
import { photoExtensionForType, validateFamilyPhoto } from "@/lib/family-directory"
import type { PhotoshowPhoto } from "@/lib/live-updates/photoshow-shared"

export type { PhotoshowPhoto }
export {
  PHOTOSHOW_INTERVAL_MS,
  computePhotoshowIndex,
} from "@/lib/live-updates/photoshow-shared"

export { validateFamilyPhoto as validatePhotoshowPhoto }

let schemaEnsured = false

export async function ensurePhotoshowSchema(): Promise<void> {
  if (schemaEnsured) return

  await sql.query(`
    CREATE TABLE IF NOT EXISTS live_updates_photos (
      id TEXT PRIMARY KEY,
      image_url TEXT NOT NULL,
      caption TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  schemaEnsured = true
}

function mapRow(row: Record<string, unknown>): PhotoshowPhoto {
  return {
    id: String(row.id),
    image_url: String(row.image_url),
    caption: row.caption != null && String(row.caption).trim() ? String(row.caption) : null,
    sort_order: Number(row.sort_order ?? 0),
    is_active: Number(row.is_active) === 1,
    created_at: String(row.created_at),
  }
}

/** Active photos for TV displays, ordered for the slideshow. */
export async function listActivePhotoshowPhotos(): Promise<PhotoshowPhoto[]> {
  await ensurePhotoshowSchema()
  const rows = await sql`
    SELECT id, image_url, caption, sort_order, is_active, created_at
    FROM live_updates_photos
    WHERE is_active = 1
    ORDER BY sort_order ASC, created_at ASC
  `
  return rows.map((row) => mapRow(row as Record<string, unknown>))
}

export async function countActivePhotoshowPhotos(): Promise<number> {
  await ensurePhotoshowSchema()
  const [row] = await sql`
    SELECT COUNT(*) AS count
    FROM live_updates_photos
    WHERE is_active = 1
  `
  return Number(row?.count ?? 0)
}

/** All photos for admin management. */
export async function listAllPhotoshowPhotos(): Promise<PhotoshowPhoto[]> {
  await ensurePhotoshowSchema()
  const rows = await sql`
    SELECT id, image_url, caption, sort_order, is_active, created_at
    FROM live_updates_photos
    ORDER BY sort_order ASC, created_at ASC
  `
  return rows.map((row) => mapRow(row as Record<string, unknown>))
}

export async function uploadPhotoshowPhoto(
  bytes: ArrayBuffer,
  contentType: string,
): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "Photo storage is not configured. Set BLOB_READ_WRITE_TOKEN in Vercel for photoshow uploads.",
    )
  }

  const extension = photoExtensionForType(contentType)
  const pathname = `photoshow/${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`
  const blob = await put(pathname, Buffer.from(bytes), {
    access: "public",
    contentType,
    addRandomSuffix: false,
  })

  return blob.url
}

async function deletePhotoshowBlob(url: string | null | undefined) {
  if (!url || !url.includes("blob.vercel-storage.com")) return
  try {
    await del(url)
  } catch (error) {
    console.error("[photoshow] Failed to delete blob:", error)
  }
}

export async function createPhotoshowPhoto(input: {
  imageUrl: string
  caption?: string | null
}): Promise<PhotoshowPhoto> {
  await ensurePhotoshowSchema()

  const [maxRow] = await sql`
    SELECT COALESCE(MAX(sort_order), -1) AS max_order
    FROM live_updates_photos
  `
  const sortOrder = Number(maxRow?.max_order ?? -1) + 1
  const id = randomUUID()
  const caption = input.caption?.trim() || null

  await sql`
    INSERT INTO live_updates_photos (id, image_url, caption, sort_order, is_active)
    VALUES (${id}, ${input.imageUrl}, ${caption}, ${sortOrder}, 1)
  `

  const [row] = await sql`
    SELECT id, image_url, caption, sort_order, is_active, created_at
    FROM live_updates_photos
    WHERE id = ${id}
    LIMIT 1
  `
  return mapRow(row as Record<string, unknown>)
}

export async function updatePhotoshowPhoto(
  id: string,
  updates: {
    caption?: string | null
    isActive?: boolean
    sortOrder?: number
  },
): Promise<PhotoshowPhoto | null> {
  await ensurePhotoshowSchema()

  const [existing] = await sql`
    SELECT id, image_url, caption, sort_order, is_active, created_at
    FROM live_updates_photos
    WHERE id = ${id}
    LIMIT 1
  `
  if (!existing) return null

  const caption =
    updates.caption !== undefined
      ? updates.caption?.trim() || null
      : existing.caption != null
        ? String(existing.caption)
        : null
  const isActive =
    updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : Number(existing.is_active)
  const sortOrder =
    updates.sortOrder !== undefined ? updates.sortOrder : Number(existing.sort_order)

  await sql`
    UPDATE live_updates_photos
    SET caption = ${caption},
        is_active = ${isActive},
        sort_order = ${sortOrder}
    WHERE id = ${id}
  `

  const [row] = await sql`
    SELECT id, image_url, caption, sort_order, is_active, created_at
    FROM live_updates_photos
    WHERE id = ${id}
    LIMIT 1
  `
  return mapRow(row as Record<string, unknown>)
}

export async function deletePhotoshowPhoto(id: string): Promise<boolean> {
  await ensurePhotoshowSchema()

  const [existing] = await sql`
    SELECT image_url FROM live_updates_photos WHERE id = ${id} LIMIT 1
  `
  if (!existing) return false

  await sql`DELETE FROM live_updates_photos WHERE id = ${id}`
  await deletePhotoshowBlob(String(existing.image_url))
  return true
}

export async function reorderPhotoshowPhotos(orderedIds: string[]): Promise<void> {
  await ensurePhotoshowSchema()
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i]
    if (!id) continue
    await sql`
      UPDATE live_updates_photos
      SET sort_order = ${i}
      WHERE id = ${id}
    `
  }
}
