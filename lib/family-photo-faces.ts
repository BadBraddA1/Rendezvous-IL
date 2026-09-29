import { sql, type SqlRow } from "@/lib/db"
import { getFamilyMembers } from "@/lib/family-auth"

export type FamilyPhotoFace = {
  id: number
  family_id: number
  /** Normalized 0–1 relative to the stored directory JPEG. */
  x: number
  y: number
  w: number
  h: number
  label: string | null
  sort_order: number
}

/** Public directory payload — only labeled faces. */
export type DirectoryPhotoFace = {
  x: number
  y: number
  w: number
  h: number
  label: string
}

let facesSchemaReady: Promise<void> | null = null

export async function ensureFamilyPhotoFacesSchema(): Promise<void> {
  if (!facesSchemaReady) {
    facesSchemaReady = (async () => {
      await sql.query(`
        CREATE TABLE IF NOT EXISTS family_photo_faces (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          family_id INTEGER NOT NULL,
          photo_url TEXT,
          x REAL NOT NULL,
          y REAL NOT NULL,
          w REAL NOT NULL,
          h REAL NOT NULL,
          label TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)
      await sql.query(
        `CREATE INDEX IF NOT EXISTS idx_family_photo_faces_family ON family_photo_faces(family_id)`,
      )
    })()
  }
  await facesSchemaReady
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function mapFace(row: SqlRow): FamilyPhotoFace {
  return {
    id: Number(row.id),
    family_id: Number(row.family_id),
    x: clamp01(Number(row.x)),
    y: clamp01(Number(row.y)),
    w: clamp01(Number(row.w)),
    h: clamp01(Number(row.h)),
    label: row.label ? String(row.label).trim() || null : null,
    sort_order: Number(row.sort_order ?? 0),
  }
}

export async function listFamilyPhotoFaces(familyId: number): Promise<FamilyPhotoFace[]> {
  await ensureFamilyPhotoFacesSchema()
  const rows = await sql`
    SELECT id, family_id, x, y, w, h, label, sort_order
    FROM family_photo_faces
    WHERE family_id = ${familyId}
    ORDER BY sort_order ASC, id ASC
  `
  return rows.map(mapFace)
}

export async function clearFamilyPhotoFaces(familyId: number): Promise<void> {
  await ensureFamilyPhotoFacesSchema()
  await sql`DELETE FROM family_photo_faces WHERE family_id = ${familyId}`
}

export async function replaceFamilyPhotoFaces(
  familyId: number,
  photoUrl: string | null,
  faces: Array<{ x: number; y: number; w: number; h: number; label?: string | null }>,
): Promise<FamilyPhotoFace[]> {
  await ensureFamilyPhotoFacesSchema()
  await sql`DELETE FROM family_photo_faces WHERE family_id = ${familyId}`

  for (let i = 0; i < faces.length; i++) {
    const face = faces[i]
    const x = clamp01(face.x)
    const y = clamp01(face.y)
    const w = clamp01(face.w)
    const h = clamp01(face.h)
    if (w < 0.02 || h < 0.02) continue
    const label = face.label?.trim() || null
    await sql`
      INSERT INTO family_photo_faces (family_id, photo_url, x, y, w, h, label, sort_order)
      VALUES (${familyId}, ${photoUrl}, ${x}, ${y}, ${w}, ${h}, ${label}, ${i})
    `
  }

  return listFamilyPhotoFaces(familyId)
}

export async function updateFamilyPhotoFaceLabels(
  familyId: number,
  updates: Array<{ id: number; label: string | null }>,
): Promise<FamilyPhotoFace[]> {
  await ensureFamilyPhotoFacesSchema()
  for (const update of updates) {
    const label = update.label?.trim() || null
    await sql`
      UPDATE family_photo_faces
      SET label = ${label}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${update.id} AND family_id = ${familyId}
    `
  }
  return listFamilyPhotoFaces(familyId)
}

/** Labeled faces for directory cards, keyed by family id. */
export async function labeledFacesByFamilyIds(
  familyIds: number[],
): Promise<Map<number, DirectoryPhotoFace[]>> {
  const map = new Map<number, DirectoryPhotoFace[]>()
  if (familyIds.length === 0) return map

  await ensureFamilyPhotoFacesSchema()
  const placeholders = familyIds.map(() => "?").join(",")
  const rows = await sql.query(
    `SELECT family_id, x, y, w, h, label, sort_order
     FROM family_photo_faces
     WHERE family_id IN (${placeholders})
       AND label IS NOT NULL
       AND TRIM(label) != ''
     ORDER BY sort_order ASC, id ASC`,
    familyIds,
  )

  for (const row of rows) {
    const familyId = Number(row.family_id)
    const label = String(row.label ?? "").trim()
    if (!label) continue
    const bucket = map.get(familyId) || []
    bucket.push({
      x: clamp01(Number(row.x)),
      y: clamp01(Number(row.y)),
      w: clamp01(Number(row.w)),
      h: clamp01(Number(row.h)),
      label,
    })
    map.set(familyId, bucket)
  }
  return map
}

export async function suggestFaceNames(familyId: number): Promise<string[]> {
  const names = new Set<string>()

  try {
    const [family] = await sql`
      SELECT husband_first_name, wife_first_name, family_last_name
      FROM families
      WHERE id = ${familyId}
    `
    if (family?.husband_first_name) {
      names.add(String(family.husband_first_name).trim().split(/\s+/)[0] || "")
    }
    if (family?.wife_first_name) {
      names.add(String(family.wife_first_name).trim().split(/\s+/)[0] || "")
    }
  } catch {
    // ignore
  }

  const members = await getFamilyMembers(familyId)
  for (const member of members) {
    const first = String(member.first_name || "").trim()
    if (first) names.add(first.split(/\s+/)[0] || first)
  }

  return [...names].filter(Boolean)
}

type DetectedBox = { x: number; y: number; w: number; h: number }

export type FaceDetectResult = {
  faces: DetectedBox[]
  /** Human-readable failure when no usable boxes were returned. */
  error?: string
}

function scaleIfMill(box: DetectedBox): DetectedBox {
  const max = Math.max(box.x, box.y, box.w, box.h)
  if (max <= 1.5) return box
  const div = max <= 100 ? 100 : 1000
  return {
    x: clamp01(box.x / div),
    y: clamp01(box.y / div),
    w: clamp01(box.w / div),
    h: clamp01(box.h / div),
  }
}

function parseFaceItem(item: unknown): DetectedBox | null {
  if (!item || typeof item !== "object") return null
  const box = item as Record<string, unknown>

  const box2d = box.box_2d ?? box.box
  if (Array.isArray(box2d) && box2d.length >= 4) {
    const [p0, p1, p2, p3] = box2d.map(Number)
    if (![p0, p1, p2, p3].every(Number.isFinite)) return null
    // Gemini often returns [y_min, x_min, y_max, x_max] on a 0–1000 scale.
    const gemini = scaleIfMill({
      x: Math.min(p1, p3),
      y: Math.min(p0, p2),
      w: Math.abs(p3 - p1),
      h: Math.abs(p2 - p0),
    })
    if (gemini.w >= 0.015 && gemini.h >= 0.015) return gemini
    const xyxy = scaleIfMill({
      x: Math.min(p0, p2),
      y: Math.min(p1, p3),
      w: Math.abs(p2 - p0),
      h: Math.abs(p3 - p1),
    })
    if (xyxy.w >= 0.015 && xyxy.h >= 0.015) return xyxy
    return null
  }

  const x = Number(box.x)
  const y = Number(box.y)
  let w = Number(box.w ?? box.width)
  let h = Number(box.h ?? box.height)
  const x2 = Number(box.x2 ?? box.xmax)
  const y2 = Number(box.y2 ?? box.ymax)
  if (Number.isFinite(x2) && Number.isFinite(y2) && (!Number.isFinite(w) || w === 0)) {
    w = x2 - x
    h = y2 - y
  }
  if (![x, y, w, h].every(Number.isFinite)) return null
  const scaled = scaleIfMill({ x: clamp01(x), y: clamp01(y), w: clamp01(w), h: clamp01(h) })
  return scaled.w >= 0.015 && scaled.h >= 0.015 ? scaled : null
}

function parseFaceJson(text: string): DetectedBox[] {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
  const parsed = JSON.parse(cleaned) as { faces?: unknown }
  if (!Array.isArray(parsed.faces)) return []

  return parsed.faces
    .map(parseFaceItem)
    .filter((box): box is DetectedBox => Boolean(box))
    .slice(0, 12)
}

/**
 * Ask a vision model (via Vercel AI Gateway) for face boxes in the final stored JPEG.
 */
export async function detectFacesInPhotoBuffer(buffer: Buffer): Promise<FaceDetectResult> {
  const apiKey = process.env.AI_GATEWAY_API_KEY
  if (!apiKey) {
    console.warn("[family-photo-faces] AI_GATEWAY_API_KEY missing; skipping face detect")
    return {
      faces: [],
      error: "Face detection is not configured on the server (missing AI_GATEWAY_API_KEY).",
    }
  }

  // Keep the vision payload small/reliable.
  let jpeg = buffer
  let imageWidth = 0
  let imageHeight = 0
  try {
    const sharp = (await import("sharp")).default
    const rotated = sharp(buffer, { failOn: "none" }).rotate()
    const meta = await rotated.metadata()
    imageWidth = meta.width ?? 0
    imageHeight = meta.height ?? 0
    jpeg = await rotated
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()
    const resizedMeta = await sharp(jpeg).metadata()
    imageWidth = resizedMeta.width ?? imageWidth
    imageHeight = resizedMeta.height ?? imageHeight
  } catch {
    // use original buffer
  }

  const model =
    process.env.FAMILY_PHOTO_FACE_MODEL ||
    process.env.GEMINI_OCR_MODEL ||
    "google/gemini-2.5-flash"
  const b64 = jpeg.toString("base64")
  const gateway = "https://ai-gateway.vercel.sh/v1"

  const body = JSON.stringify({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You locate people in a family photo so parents can label names. " +
          'Reply with JSON only: {"faces":[{"x":0.1,"y":0.2,"w":0.15,"h":0.2}]}. ' +
          "Each box is normalized 0–1 relative to image width/height " +
          "(x,y = top-left of the head/face, w/h = size). " +
          "Include every clearly visible person. Empty array only if nobody is visible.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              (imageWidth > 0 && imageHeight > 0
                ? `The image is ${imageWidth}×${imageHeight} pixels. `
                : "") +
              "Return a bounding box for every person's head/face in this photo. " +
              "Use top-left (x,y) and size (w,h) as fractions of full image width and height.",
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${b64}` },
          },
        ],
      },
    ],
  })

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 45_000)
  try {
    const res = await fetch(`${gateway}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: ac.signal,
      body,
    })
    const raw = await res.text()
    if (!res.ok) {
      console.error("[family-photo-faces] detect failed:", res.status, raw.slice(0, 300))
      return {
        faces: [],
        error: `Face detection failed (${res.status}). Try again in a moment.`,
      }
    }
    const data = JSON.parse(raw) as {
      choices?: { message?: { content?: string } }[]
    }
    const text = data.choices?.[0]?.message?.content || "{}"
    const faces = parseFaceJson(text)
    if (faces.length === 0) {
      return {
        faces: [],
        error: "No faces found in this photo. Try a clearer group shot, or retake outdoors with faces visible.",
      }
    }
    return { faces }
  } catch (error) {
    console.error(
      "[family-photo-faces] detect error:",
      error instanceof Error ? error.message : error,
    )
    return {
      faces: [],
      error:
        error instanceof Error && error.name === "AbortError"
          ? "Face detection timed out. Try again."
          : "Face detection failed. Try again.",
    }
  } finally {
    clearTimeout(timer)
  }
}

/** Clear prior faces, detect on the new JPEG, store unlabeled boxes. */
export async function detectAndStoreFamilyPhotoFaces(
  familyId: number,
  photoUrl: string,
  jpegBuffer: Buffer,
): Promise<{ faces: FamilyPhotoFace[]; error?: string }> {
  const result = await detectFacesInPhotoBuffer(jpegBuffer)
  const faces = await replaceFamilyPhotoFaces(familyId, photoUrl, result.faces)
  return { faces, error: result.error }
}
