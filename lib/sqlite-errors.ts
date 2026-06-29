export function isMissingSqliteColumn(error: unknown, column: string): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return new RegExp(`no such column:\\s*${column}\\b`, "i").test(message)
}

export function getSqliteErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
