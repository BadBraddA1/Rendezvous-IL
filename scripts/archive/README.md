# Archived scripts

## migrate-neon-to-turso.mjs

One-time migration from Neon Postgres to Turso (completed). Kept for reference only.

Requires `@neondatabase/serverless` if you ever need to re-run:

```bash
pnpm add -D @neondatabase/serverless
NEON_DATABASE_URL=... TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/archive/migrate-neon-to-turso.mjs
```
