# Database Setup

Rendezvous IL uses **Turso** (libSQL / SQLite) for all application data.

See **[TURSO_SETUP.md](./TURSO_SETUP.md)** for:

- Vercel environment variables (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`)
- Schema (`scripts/schema-turso.sql`)
- Verifying the connection (`pnpm db:verify`)
- Legacy Neon migration notes (completed — script in `scripts/archive/`)

## SQL scripts in `/scripts`

| File | Purpose |
|------|---------|
| `schema-turso.sql` | **Current** — full Turso/SQLite schema |
| `create-*.sql`, `add-*.sql` | **Legacy** — original Postgres migrations (reference only) |

Apply schema changes to Turso via the Turso shell or `turso db shell`:

```bash
turso db shell your-db-name < scripts/schema-turso.sql
```
