type ClerkErrorShape = {
  errors?: { message?: string; longMessage?: string }[]
}

export function clerkErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "errors" in error) {
    const errors = (error as ClerkErrorShape).errors
    const first = errors?.[0]
    if (first?.longMessage) return first.longMessage
    if (first?.message) return first.message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
