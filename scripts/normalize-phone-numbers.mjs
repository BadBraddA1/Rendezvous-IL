#!/usr/bin/env node
/**
 * Retroactively normalize phone numbers in Turso and the static 2026 map dataset.
 *
 * Usage:
 *   node scripts/normalize-phone-numbers.mjs          # DB + map file
 *   node scripts/normalize-phone-numbers.mjs --dry-run
 *   node scripts/normalize-phone-numbers.mjs --map-only
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@libsql/client"
import { loadEnvFiles } from "./load-env.mjs"

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const dryRun = process.argv.includes("--dry-run")
const mapOnly = process.argv.includes("--map-only")

function normalizePhoneDigits(value) {
  if (!value) return ""
  const digits = String(value).replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1)
  return digits
}

function formatPhoneNumber(value) {
  if (value == null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  const digits = normalizePhoneDigits(trimmed)
  if (digits.length === 0) return null
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return formatPhoneNumber(digits.slice(1))
  }
  return trimmed
}

function formatPhoneForStorage(value) {
  if (value == null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  return formatPhoneNumber(trimmed) ?? trimmed
}

async function normalizeColumn(db, table, column, where = "1=1") {
  const rows = await db.execute(`SELECT rowid AS _rowid, ${column} AS value FROM ${table} WHERE ${where} AND ${column} IS NOT NULL AND TRIM(${column}) != ''`)
  let updated = 0
  for (const row of rows.rows) {
    const current = String(row.value)
    const next = formatPhoneForStorage(current)
    if (!next || next === current) continue
    updated++
    console.log(`  ${table}.${column} row ${row._rowid}: ${current} -> ${next}`)
    if (!dryRun) {
      await db.execute({
        sql: `UPDATE ${table} SET ${column} = ? WHERE rowid = ?`,
        args: [next, row._rowid],
      })
    }
  }
  return updated
}

async function migrateLegacyPhonesToMembers(db) {
  const families = await db.execute(`
    SELECT id, husband_first_name, wife_first_name, husband_phone, wife_phone
    FROM families
    WHERE (husband_phone IS NOT NULL AND TRIM(husband_phone) != '')
       OR (wife_phone IS NOT NULL AND TRIM(wife_phone) != '')
  `)

  let migrated = 0
  for (const family of families.rows) {
    const familyId = family.id
    const members = await db.execute({
      sql: `SELECT id, first_name, phone FROM family_members_v2 WHERE family_id = ?`,
      args: [familyId],
    })

    const pairs = [
      { name: family.husband_first_name, phone: family.husband_phone },
      { name: family.wife_first_name, phone: family.wife_phone },
    ]

    for (const { name, phone } of pairs) {
      const formatted = formatPhoneForStorage(phone)
      if (!formatted || !name) continue
      const targetName = String(name).trim().toLowerCase()
      if (!targetName) continue

      const match = members.rows.find((member) => {
        const memberPhone = member.phone ? String(member.phone).trim() : ""
        if (memberPhone) return false
        return String(member.first_name).trim().toLowerCase() === targetName
      })

      if (!match) continue
      migrated++
      console.log(`  family ${familyId} member ${match.id} (${name}): -> ${formatted}`)
      if (!dryRun) {
        await db.execute({
          sql: `UPDATE family_members_v2 SET phone = ? WHERE id = ? AND family_id = ?`,
          args: [formatted, match.id, familyId],
        })
      }
    }
  }
  return migrated
}

function formatMap2026DataFile() {
  const filePath = path.join(projectRoot, "lib/map2026-registrations-data.ts")
  let content = fs.readFileSync(filePath, "utf8")
  let changes = 0

  content = content.replace(
    /(husbandPhone|wifePhone): "([^"]*)"/g,
    (match, key, raw) => {
      const next = formatPhoneForStorage(raw)
      if (!next || next === raw) return match
      changes++
      return `${key}: "${next}"`
    },
  )

  if (changes > 0 && !dryRun) {
    fs.writeFileSync(filePath, content)
  }
  return changes
}

async function main() {
  loadEnvFiles()

  console.log(dryRun ? "DRY RUN — no writes" : "Normalizing phone numbers…")

  if (!mapOnly) {
    const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL
    const authToken = process.env.TURSO_AUTH_TOKEN
    if (!url || !authToken) {
      console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN (skipping DB)")
    } else {
      const db = createClient({ url, authToken })
      const tables = [
        ["registrations", "husband_phone"],
        ["registrations", "wife_phone"],
        ["registrations", "emergency_contact_phone"],
        ["families", "husband_phone"],
        ["families", "wife_phone"],
        ["family_members_v2", "phone"],
        ["registrations_v2", "emergency_contact_phone"],
      ]

      let total = 0
      for (const [table, column] of tables) {
        const count = await db.execute(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name=?`, [table])
        if (!count.rows[0]?.n) {
          console.log(`Skip missing table ${table}`)
          continue
        }
        console.log(`\n${table}.${column}`)
        total += await normalizeColumn(db, table, column)
      }

      console.log("\nBackfill member phones from legacy family fields (name match only)")
      const migrated = await migrateLegacyPhonesToMembers(db)
      console.log(`\nDB: ${total} phone field(s) reformatted, ${migrated} member phone(s) backfilled`)
    }
  }

  const mapChanges = formatMap2026DataFile()
  console.log(`\nmap2026-registrations-data.ts: ${mapChanges} phone(s) reformatted`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
