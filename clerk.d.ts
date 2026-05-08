// Type definitions for Clerk session claims
// This allows TypeScript to understand the custom metadata structure

export {}

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: "admin" | "user"
    }
  }
}
