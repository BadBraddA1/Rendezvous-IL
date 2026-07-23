import { createHash, randomUUID } from "crypto"
import { del, put } from "@vercel/blob"
import { sql, type SqlRow } from "@/lib/db"
import {
  DEFAULT_REGISTRATION_EVENT_YEAR,
  parseRegistrationEventYear,
  type RegistrationEventYear,
} from "@/lib/registration-event-years"

export type SongFileType = "pdf" | "image"

export interface SongPack {
  id: string
  name: string
  slug: string
  description: string | null
  event_year: RegistrationEventYear
  sort_order: number
  is_published: boolean
  updated_at: string
  created_at: string
  item_count?: number
}

export interface SongPackItem {
  id: string
  pack_id: string
  title: string
  sort_order: number
  file_url: string
  file_type: SongFileType
  byte_size: number
  content_hash: string
  created_at: string
  updated_at: string
}

export interface SongPackDetail extends SongPack {
  items: SongPackItem[]
}

const MAX_PDF_BYTES = 20 * 1024 * 1024
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

let schemaReady = false

export async function ensureSongPacksSchema(): Promise<void> {
  if (schemaReady) return

  await sql.query(`
    CREATE TABLE IF NOT EXISTS song_packs (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      event_year INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await sql.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_song_packs_year_slug
    ON song_packs (event_year, slug)
  `)

  await sql.query(`
    CREATE TABLE IF NOT EXISTS song_pack_items (
      id TEXT PRIMARY KEY NOT NULL,
      pack_id TEXT NOT NULL,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      file_url TEXT NOT NULL,
      file_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL DEFAULT 0,
      content_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await sql.query(`
    CREATE INDEX IF NOT EXISTS idx_song_pack_items_pack
    ON song_pack_items (pack_id, sort_order)
  `)

  await seedDefaultPacks(DEFAULT_REGISTRATION_EVENT_YEAR)
  schemaReady = true
}

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return base || `pack-${randomUUID().slice(0, 8)}`
}

async function seedDefaultPacks(year: RegistrationEventYear): Promise<void> {
  const defaults = [
    { name: "Campfire", slug: "campfire", description: "Songs for campfire night", sort: 0 },
    {
      name: "Racket Ball Singing",
      slug: "racket-ball-singing",
      description: "Songs for racket ball singing",
      sort: 1,
    },
  ]

  for (const pack of defaults) {
    const existing = await sql`
      SELECT id FROM song_packs
      WHERE event_year = ${year} AND slug = ${pack.slug}
      LIMIT 1
    `
    if (existing.length > 0) continue
    const id = randomUUID()
    await sql`
      INSERT INTO song_packs (
        id, name, slug, description, event_year, sort_order, is_published
      ) VALUES (
        ${id}, ${pack.name}, ${pack.slug}, ${pack.description}, ${year}, ${pack.sort}, 0
      )
    `
  }
}

function mapPack(row: SqlRow, itemCount?: number): SongPack {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description != null ? String(row.description) : null,
    event_year: parseRegistrationEventYear(row.event_year),
    sort_order: Number(row.sort_order ?? 0),
    is_published: Number(row.is_published) === 1,
    updated_at: String(row.updated_at),
    created_at: String(row.created_at),
    item_count: itemCount,
  }
}

function mapItem(row: SqlRow): SongPackItem {
  const fileType = String(row.file_type) === "pdf" ? "pdf" : "image"
  return {
    id: String(row.id),
    pack_id: String(row.pack_id),
    title: String(row.title),
    sort_order: Number(row.sort_order ?? 0),
    file_url: String(row.file_url),
    file_type: fileType,
    byte_size: Number(row.byte_size ?? 0),
    content_hash: String(row.content_hash),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export function validateSongPackFile(file: { type: string; size: number }): string | null {
  const type = file.type.toLowerCase()
  const isPdf = type === "application/pdf"
  const isImage = type === "image/jpeg" || type === "image/png" || type === "image/webp"
  if (!isPdf && !isImage) {
    return "File must be a PDF or an image (JPG, PNG, or WebP)"
  }
  if (isPdf && file.size > MAX_PDF_BYTES) {
    return "PDF must be 20 MB or smaller"
  }
  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return "Image must be 8 MB or smaller"
  }
  if (file.size <= 0) return "File is empty"
  return null
}

export function songFileTypeForContentType(contentType: string): SongFileType {
  return contentType.toLowerCase() === "application/pdf" ? "pdf" : "image"
}

function extensionForContentType(contentType: string): string {
  const type = contentType.toLowerCase()
  if (type === "application/pdf") return "pdf"
  if (type === "image/png") return "png"
  if (type === "image/webp") return "webp"
  return "jpg"
}

export function hashSongFileBytes(bytes: ArrayBuffer): string {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex")
}

export async function uploadSongPackFile(
  packId: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<{ url: string; byteSize: number; contentHash: string; fileType: SongFileType }> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "File storage is not configured. Set BLOB_READ_WRITE_TOKEN in Vercel for song pack uploads.",
    )
  }

  const fileType = songFileTypeForContentType(contentType)
  const extension = extensionForContentType(contentType)
  const contentHash = hashSongFileBytes(bytes)
  const pathname = `song-packs/${packId}/${Date.now()}-${contentHash.slice(0, 12)}.${extension}`
  const blob = await put(pathname, Buffer.from(bytes), {
    access: "public",
    contentType,
    addRandomSuffix: false,
  })

  return {
    url: blob.url,
    byteSize: bytes.byteLength,
    contentHash,
    fileType,
  }
}

async function deleteSongBlob(url: string | null | undefined) {
  if (!url || !url.includes("blob.vercel-storage.com")) return
  try {
    await del(url)
  } catch (error) {
    console.error("[song-packs] Failed to delete blob:", error)
  }
}

async function touchPack(packId: string) {
  await sql`
    UPDATE song_packs SET updated_at = datetime('now') WHERE id = ${packId}
  `
}

export async function listSongPacks(options: {
  eventYear?: RegistrationEventYear
  publishedOnly?: boolean
}): Promise<SongPack[]> {
  await ensureSongPacksSchema()
  const year = options.eventYear ?? DEFAULT_REGISTRATION_EVENT_YEAR

  const rows = options.publishedOnly
    ? await sql`
        SELECT p.*,
          (SELECT COUNT(*) FROM song_pack_items i WHERE i.pack_id = p.id) AS item_count
        FROM song_packs p
        WHERE p.event_year = ${year} AND p.is_published = 1
        ORDER BY p.sort_order ASC, p.name ASC
      `
    : await sql`
        SELECT p.*,
          (SELECT COUNT(*) FROM song_pack_items i WHERE i.pack_id = p.id) AS item_count
        FROM song_packs p
        WHERE p.event_year = ${year}
        ORDER BY p.sort_order ASC, p.name ASC
      `

  return rows.map((row) =>
    mapPack(row as SqlRow, row.item_count != null ? Number(row.item_count) : 0),
  )
}

export async function getSongPackDetail(
  packId: string,
  options: { publishedOnly?: boolean } = {},
): Promise<SongPackDetail | null> {
  await ensureSongPacksSchema()
  const id = packId.trim()
  if (!id) return null

  const packs = options.publishedOnly
    ? await sql`
        SELECT * FROM song_packs WHERE id = ${id} AND is_published = 1 LIMIT 1
      `
    : await sql`
        SELECT * FROM song_packs WHERE id = ${id} LIMIT 1
      `
  if (!packs[0]) return null

  const items = await sql`
    SELECT * FROM song_pack_items
    WHERE pack_id = ${id}
    ORDER BY sort_order ASC, created_at ASC
  `

  const pack = mapPack(packs[0] as SqlRow, items.length)
  return {
    ...pack,
    items: items.map((row) => mapItem(row as SqlRow)),
  }
}

export async function createSongPack(input: {
  name: string
  description?: string | null
  eventYear?: RegistrationEventYear
}): Promise<SongPack> {
  await ensureSongPacksSchema()
  const name = input.name.trim()
  if (!name) throw new Error("Pack name is required")

  const eventYear = input.eventYear ?? DEFAULT_REGISTRATION_EVENT_YEAR
  let slug = slugify(name)
  const clash = await sql`
    SELECT id FROM song_packs WHERE event_year = ${eventYear} AND slug = ${slug} LIMIT 1
  `
  if (clash[0]) slug = `${slug}-${randomUUID().slice(0, 6)}`

  const [maxRow] = await sql`
    SELECT COALESCE(MAX(sort_order), -1) AS max_order
    FROM song_packs WHERE event_year = ${eventYear}
  `
  const sortOrder = Number(maxRow?.max_order ?? -1) + 1
  const id = randomUUID()
  const description = input.description?.trim() || null

  await sql`
    INSERT INTO song_packs (
      id, name, slug, description, event_year, sort_order, is_published
    ) VALUES (
      ${id}, ${name}, ${slug}, ${description}, ${eventYear}, ${sortOrder}, 0
    )
  `

  const detail = await getSongPackDetail(id)
  if (!detail) throw new Error("Failed to create pack")
  return detail
}

export async function updateSongPack(
  packId: string,
  updates: {
    name?: string
    description?: string | null
    isPublished?: boolean
    sortOrder?: number
  },
): Promise<SongPack | null> {
  await ensureSongPacksSchema()
  const existing = await getSongPackDetail(packId)
  if (!existing) return null

  const name = updates.name !== undefined ? updates.name.trim() : existing.name
  if (!name) throw new Error("Pack name is required")
  const description =
    updates.description !== undefined
      ? updates.description?.trim() || null
      : existing.description
  const isPublished =
    updates.isPublished !== undefined ? (updates.isPublished ? 1 : 0) : existing.is_published ? 1 : 0
  const sortOrder =
    updates.sortOrder !== undefined ? updates.sortOrder : existing.sort_order

  await sql`
    UPDATE song_packs
    SET name = ${name},
        description = ${description},
        is_published = ${isPublished},
        sort_order = ${sortOrder},
        updated_at = datetime('now')
    WHERE id = ${packId}
  `

  return getSongPackDetail(packId)
}

export async function deleteSongPack(packId: string): Promise<boolean> {
  await ensureSongPacksSchema()
  const detail = await getSongPackDetail(packId)
  if (!detail) return false

  for (const item of detail.items) {
    await deleteSongBlob(item.file_url)
  }
  await sql`DELETE FROM song_pack_items WHERE pack_id = ${packId}`
  await sql`DELETE FROM song_packs WHERE id = ${packId}`
  return true
}

export async function reorderSongPacks(orderedIds: string[]): Promise<void> {
  await ensureSongPacksSchema()
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i]
    if (!id) continue
    await sql`
      UPDATE song_packs SET sort_order = ${i}, updated_at = datetime('now') WHERE id = ${id}
    `
  }
}

export async function addSongPackItem(input: {
  packId: string
  title: string
  fileUrl: string
  fileType: SongFileType
  byteSize: number
  contentHash: string
}): Promise<SongPackItem> {
  await ensureSongPacksSchema()
  const pack = await getSongPackDetail(input.packId)
  if (!pack) throw new Error("Pack not found")

  const title = input.title.trim()
  if (!title) throw new Error("Song title is required")

  const [maxRow] = await sql`
    SELECT COALESCE(MAX(sort_order), -1) AS max_order
    FROM song_pack_items WHERE pack_id = ${input.packId}
  `
  const sortOrder = Number(maxRow?.max_order ?? -1) + 1
  const id = randomUUID()

  await sql`
    INSERT INTO song_pack_items (
      id, pack_id, title, sort_order, file_url, file_type, byte_size, content_hash
    ) VALUES (
      ${id}, ${input.packId}, ${title}, ${sortOrder},
      ${input.fileUrl}, ${input.fileType}, ${input.byteSize}, ${input.contentHash}
    )
  `
  await touchPack(input.packId)

  const [row] = await sql`SELECT * FROM song_pack_items WHERE id = ${id} LIMIT 1`
  return mapItem(row as SqlRow)
}

export async function updateSongPackItem(
  itemId: string,
  updates: {
    title?: string
    sortOrder?: number
    fileUrl?: string
    fileType?: SongFileType
    byteSize?: number
    contentHash?: string
  },
): Promise<SongPackItem | null> {
  await ensureSongPacksSchema()
  const [existing] = await sql`
    SELECT * FROM song_pack_items WHERE id = ${itemId} LIMIT 1
  `
  if (!existing) return null

  const title =
    updates.title !== undefined ? updates.title.trim() : String(existing.title)
  if (!title) throw new Error("Song title is required")

  const sortOrder =
    updates.sortOrder !== undefined ? updates.sortOrder : Number(existing.sort_order)
  const fileUrl =
    updates.fileUrl !== undefined ? updates.fileUrl : String(existing.file_url)
  const fileType =
    updates.fileType !== undefined
      ? updates.fileType
      : String(existing.file_type) === "pdf"
        ? "pdf"
        : "image"
  const byteSize =
    updates.byteSize !== undefined ? updates.byteSize : Number(existing.byte_size)
  const contentHash =
    updates.contentHash !== undefined
      ? updates.contentHash
      : String(existing.content_hash)

  if (updates.fileUrl && updates.fileUrl !== String(existing.file_url)) {
    await deleteSongBlob(String(existing.file_url))
  }

  await sql`
    UPDATE song_pack_items
    SET title = ${title},
        sort_order = ${sortOrder},
        file_url = ${fileUrl},
        file_type = ${fileType},
        byte_size = ${byteSize},
        content_hash = ${contentHash},
        updated_at = datetime('now')
    WHERE id = ${itemId}
  `
  await touchPack(String(existing.pack_id))

  const [row] = await sql`SELECT * FROM song_pack_items WHERE id = ${itemId} LIMIT 1`
  return mapItem(row as SqlRow)
}

export async function deleteSongPackItem(itemId: string): Promise<boolean> {
  await ensureSongPacksSchema()
  const [existing] = await sql`
    SELECT * FROM song_pack_items WHERE id = ${itemId} LIMIT 1
  `
  if (!existing) return false

  await deleteSongBlob(String(existing.file_url))
  await sql`DELETE FROM song_pack_items WHERE id = ${itemId}`
  await touchPack(String(existing.pack_id))
  return true
}

export async function reorderSongPackItems(
  packId: string,
  orderedIds: string[],
): Promise<void> {
  await ensureSongPacksSchema()
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i]
    if (!id) continue
    await sql`
      UPDATE song_pack_items
      SET sort_order = ${i}, updated_at = datetime('now')
      WHERE id = ${id} AND pack_id = ${packId}
    `
  }
  await touchPack(packId)
}
