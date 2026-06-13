# Rendezvous IL Website

Production site for the Rendezvous Christian Homeschool Family Retreat — [rendezvousil.com](https://rendezvousil.com).

Handles public event pages, family registration (2027), admin dashboard (registrations, meals, check-in, messaging), and Clerk-based family accounts.

## Tech stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Turso** (libSQL / SQLite) — all app data via `lib/db.ts` and `@libsql/client`
- **Clerk** — authentication (families + admin roles)
- **Resend** — email
- **Vercel** — hosting (project: `v0-ren`)

## Environment variables

Required on Vercel (`v0-ren`):

| Variable | Purpose |
|----------|---------|
| `TURSO_DATABASE_URL` | Turso libsql URL |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk (client) |
| `CLERK_SECRET_KEY` | Clerk (server) |
| `JWT_SECRET`, `ADMIN_SECRET`, `ADMIN_SETUP_KEY` | Admin auth |
| `RESEND_API_KEY` | Email |

Full list and legacy cleanup notes: [docs/TURSO_SETUP.md](docs/TURSO_SETUP.md)

## Local development

```bash
git clone https://github.com/BadBraddA1/Rendezvous-IL.git
cd Rendezvous-IL
pnpm install
vercel link --project v0-ren
vercel env pull .env.local --environment=production
pnpm dev
```

Verify database connectivity:

```bash
pnpm db:verify
```

## Database

- Schema: `scripts/schema-turso.sql`
- All queries: `import { sql } from "@/lib/db"`
- Migrated from Neon Postgres to Turso (one-time script archived in `scripts/archive/`)

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build |
| `pnpm db:verify` | List Turso tables and row counts |

## Design & motion

Brand and UI context: `PRODUCT.md`, `DESIGN.md`. Marketing surfaces polished: lake-teal OKLCH palette, Libre Baskerville + Libre Franklin, mobile safe-areas, accessible focus rings, semantic success/warning tokens. **Mux video:** `components/mux-video-player.tsx` — one-tap iOS playback, captions off by default; FAQ section + accordion item explain iOS Settings override; FAQ uses `deferPlayer`; homepage dynamically imports player with idle preload. **Social sharing:** `app/opengraph-image.tsx` + `app/twitter-image.tsx` (1200×630). **`/live-updates`:** lake-teal `.lu-panel` display board, 2027 branding, keyboard footer uses name + `<kbd>` shortcuts. **`/silent`:** `.brand-dark-shell` tokenized dark UI. **`/map2026`:** token surfaces, no side-stripe selection; mobile map uses `dvh`-based height so the attendee list stays reachable; clear/close controls and list rows are 44px touch targets. shadcn `Button` defaults to `min-h-11`.

## Project structure

```
rendezvous-il/
├── app/              # Next.js routes (pages + API)
├── components/       # React UI
├── lib/db.ts         # Turso database client
├── scripts/          # Schema, verify, archived migration
├── docs/             # Setup guides
└── src/              # Legacy Vue static site (not deployed)
```

## Contact

Stephen & Ranae Bradd  
824 W. Main St., Clinton, IL 61727  
(217) 935-5058 · Stephen@Bradd.us

Website: [rendezvousil.com](https://rendezvousil.com)  
Facebook: [facebook.com/groups/RendezvousIL](https://www.facebook.com/groups/RendezvousIL)
