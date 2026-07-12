/** Historical Rendezvous attendance — used on About and homepage captions. */
export const attendanceHistory = [
  { year: 2015, attendees: 50, theme: "Matthew" },
  { year: 2016, attendees: 52, theme: "John" },
  { year: 2017, attendees: 63, theme: "Acts" },
  { year: 2018, attendees: 92, theme: "Genesis" },
  { year: 2019, attendees: 73, theme: "Exodus" },
  { year: 2020, attendees: 82, theme: "Lev, Num, & Deut" },
  { year: 2021, attendees: 129, theme: "Romans" },
  { year: 2022, attendees: 138, theme: "1 Corinthians" },
  { year: 2023, attendees: 174, theme: "2 Corinthians" },
  { year: 2024, attendees: 124, theme: "Joshua" },
  { year: 2025, attendees: 118, theme: "Judges" },
  { year: 2026, attendees: 136, theme: "Galatians & Ephesians" },
  { year: 2027, attendees: "?", theme: "1 Samuel" },
] as const

/** Most recent completed year with a known headcount (for photo captions). */
export function latestCompletedAttendance(): {
  year: number
  attendees: number
  theme: string
} | null {
  for (let i = attendanceHistory.length - 1; i >= 0; i--) {
    const row = attendanceHistory[i]
    if (typeof row.attendees === "number") {
      return { year: row.year, attendees: row.attendees, theme: row.theme }
    }
  }
  return null
}
