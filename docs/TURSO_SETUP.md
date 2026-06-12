# Turso Database Setup

Rendezvous IL stores registrations, families, meals, and admin data in **Turso** (libSQL / SQLite).

## Required Vercel environment variables

Add to **v0-ren** for Production, Preview, and Development:

| Variable | Description |
|----------|-------------|
| `TURSO_DATABASE_URL` | libsql URL from Turso (e.g. `libsql://rendezvous-il-org.turso.io`) |
| `TURSO_AUTH_TOKEN` | Database auth token from Turso dashboard |

All app queries go through `lib/db.ts` using `@libsql/client`.

## Verify connection

```bash
cd ~/rendezvous-il
vercel env pull .env.local --environment=production
pnpm db:verify
```

## Schema

Full schema: `scripts/schema-turso.sql`

## Remove legacy Neon / Postgres env vars from Vercel

After Turso is live, delete these from **v0-ren** → Settings → Environment Variables:

- `NEON_DATABASE_URL`, `NEON_DATABASE_URL_UNPOOLED`, all other `NEON_*`
- `DATABASE_URL`, `NEXT_PUBLIC_DATABASE_URL`
- `NEXT_PUBLIC_NEON_STACK_*`, `NEON_STACK_SECRET_SERVER_KEY`
- `STACK_SECRET_SERVER_KEY`, `NEXT_PUBLIC_STACK_*`

## Migration (completed)

Data was migrated from Neon Postgres to Turso. The one-time script is archived at `scripts/archive/migrate-neon-to-turso.mjs`.
