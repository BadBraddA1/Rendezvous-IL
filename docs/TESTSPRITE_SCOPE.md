# TestSprite scope — Rendezvous IL

Use this file as `additionalInstruction` context when running TestSprite on **rendezvous-il**.

## Project

- **Path:** `/Users/braddford/rendezvous-il`
- **Stack:** Next.js 16, React 19, Clerk auth, Turso/SQLite
- **Local URL:** `http://localhost:3000` (`pnpm dev` or `pnpm build && pnpm start`)

## Priority test areas (frontend)

1. **Public pages** — `/`, `/schedule`, `/calculator`, `/faq`, `/about`, `/live-updates`
2. **Auth** — `/sign-in`, `/sign-up`, `/sign-in/forgot-password` (Clerk custom forms)
3. **Account** — `/account`, `/account/settings`, `/account/profile` (signed-in)
4. **Admin** — `/admin`, `/admin/registrations`, `/admin/users`, `/admin/checkin` (admin role required)
5. **Live updates kiosk** — `/live-updates?sync=1&kiosk=1` (TV display mode)

## Priority test areas (backend API)

- `GET /api/schedule`, `/api/announcements`, `/api/weather`, `/api/meals`
- `GET /api/admin/me` (Bearer token)
- `GET /api/admin/users` (full admin only)
- `POST /api/auth/activity` (authenticated ping)

## Known constraints

- Many features require **Clerk** env vars in `.env.local`
- Admin routes return 401 without admin role in Clerk metadata
- Turso DB required for registrations, announcements, meals — use production env pull or mocks for API tests
- Do **not** run destructive admin tests against production without explicit approval

## Suggested TestSprite settings

| Setting | Value |
|---------|--------|
| `type` | `frontend` (run backend separately if needed) |
| `localPort` | `3000` |
| `testScope` | `codebase` |
| `serverMode` | `development` for `pnpm dev`, `production` for `pnpm start` |
