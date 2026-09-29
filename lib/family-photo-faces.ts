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

/**
 * Ask Gemini (via Vercel AI Gateway) for face boxes in the final stored JPEG.
 * Returns [] when the key is missing or the model finds no faces.
 */
export async function detectFacesInPhotoBuffer(buffer: Buffer): Promise<DetectedBox[]> {
  const apiKey = process.env.AI_GATEWAY_API_KEY
  if (!apiKey) {
    console.warn("[family-photo-faces] AI_GATEWAY_API_KEY missing; skipping face detect")
    return []
  }

  const model =
    process.env.FAMILY_PHOTO_FACE_MODEL ||
    process.env.GEMINI_OCR_MODEL ||
    "google/gemini-2.5-flash"
  const b64 = buffer.toString("base64")
  const gateway = "https://ai-gateway.vercel.sh/v1"

  const body = JSON.stringify({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You detect human faces in family photos. Reply with JSON only: " +
          '{"faces":[{"x":0.1,"y":0.2,"w":0.15,"h":0.2}]}. ' +
          "Each box is normalized 0–1 relative to image width/height " +
          "(x,y = top-left of the face, w/h = face size). " +
          "Only include clearly visible human faces. Empty array if none.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Detect every distinct human face in this family photo.",
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
  const timer = setTimeout(() => ac.abort(), 25_000)
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
      return []
    }
    const data = JSON.parse(raw) as {
      choices?: { message?: { content?: string } }[]
    }
    const text = data.choices?.[0]?.message?.content || "{}"
    const parsed = JSON.parse(text) as { faces?: unknown }
    if (!Array.isArray(parsed.faces)) return []

    return parsed.faces
      .map((item) => {
        if (!item || typeof item !== "object") return null
        const box = item as Record<string, unknown>
        return {
          x: clamp01(Number(box.x)),
          y: clamp01(Number(box.y)),
          w: clamp01(Number(box.w)),
          h: clamp01(Number(box.h)),
        }
      })
      .filter((box): box is DetectedBox => {
        if (!box) return false
        return box.w >= 0.02 && box.h >= 0.02
      })
      .slice(0, 12)
  } catch (error) {
    console.error(
      "[family-photo-faces] detect error:",
      error instanceof Error ? error.message : error,
    )
    return []
  } finally {
    clearTimeout(timer)
  }
}

/** Clear prior faces, detect on the new JPEG, store unlabeled boxes. */
export async function detectAndStoreFamilyPhotoFaces(
  familyId: number,
  photoUrl: string,
  jpegBuffer: Buffer,
): Promise<FamilyPhotoFace[]> {
  const boxes = await detectFacesInPhotoBuffer(jpegBuffer)
  return replaceFamilyPhotoFaces(familyId, photoUrl, boxes)
}
