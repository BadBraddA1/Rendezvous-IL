import { sql, type SqlRow } from "@/lib/db"
import { formatAgeGroupLabel } from "@/lib/member-age"

export type MemberSnapshot = {
  id?: number
  first_name?: string
  last_name?: string
  member_type?: string
  age_group?: string
  gender?: string
  grade?: string | null
  special_needs?: boolean | number
  notes?: string | null
  date_of_birth?: string | null
}

export function parseMemberData(value: unknown): MemberSnapshot | null {
  if (!value) return null
  if (typeof value === "object") return value as MemberSnapshot
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as MemberSnapshot
    } catch {
      return null
    }
  }
  return null
}

function normalizeMemberRow(row: SqlRow | null | undefined): MemberSnapshot | null {
  if (!row) return null
  return {
    id: row.id as number | undefined,
    first_name: row.first_name as string | undefined,
    last_name: row.last_name as string | undefined,
    member_type: row.member_type as string | undefined,
    age_group: row.age_group as string | undefined,
    gender: row.gender as string | undefined,
    grade: (row.grade as string | null) ?? null,
    special_needs: Boolean(row.special_needs),
    notes: (row.notes as string | null) ?? null,
    date_of_birth: (row.date_of_birth as string | null) ?? null,
  }
}

export async function enrichPendingChanges(rows: SqlRow[]) {
  return Promise.all(
    rows.map(async (row) => {
      const memberData = parseMemberData(row.member_data)
      let currentMember: MemberSnapshot | null = null

      if (row.change_type === "update_member" && row.member_id) {
        const [current] = await sql`
          SELECT *
          FROM family_members_v2
          WHERE id = ${row.member_id} AND family_id = ${row.family_id}
        `
        currentMember = normalizeMemberRow(current)
      } else if (row.change_type === "remove_member") {
        currentMember = memberData
      }

      return {
        ...row,
        member_data: memberData,
        current_member: currentMember,
      }
    }),
  )
}

export function formatMemberValue(field: keyof MemberSnapshot, value: unknown): string {
  if (value === null || value === undefined || value === "") return "(empty)"

  switch (field) {
    case "age_group":
      return formatAgeGroupLabel(String(value))
    case "member_type":
      return String(value).charAt(0).toUpperCase() + String(value).slice(1)
    case "special_needs":
      return value ? "Yes" : "No"
    case "date_of_birth": {
      const date = new Date(String(value))
      if (Number.isNaN(date.getTime())) return String(value)
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    }
    default:
      return String(value)
  }
}

export const MEMBER_DIFF_FIELDS: { key: keyof MemberSnapshot; label: string }[] = [
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "member_type", label: "Member type" },
  { key: "age_group", label: "Age group" },
  { key: "date_of_birth", label: "Birthday" },
  { key: "gender", label: "Gender" },
  { key: "grade", label: "Grade" },
  { key: "special_needs", label: "Special needs" },
  { key: "notes", label: "Notes" },
]

export function memberFieldChanged(
  field: keyof MemberSnapshot,
  before: MemberSnapshot | null | undefined,
  after: MemberSnapshot | null | undefined,
): boolean {
  const oldVal = formatMemberValue(field, before?.[field])
  const newVal = formatMemberValue(field, after?.[field])
  return oldVal !== newVal
}
