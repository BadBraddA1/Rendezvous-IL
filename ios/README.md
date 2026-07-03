# Rendezvous IL — iOS App

Native SwiftUI **attendee community hub** for [rendezvousil.com](https://rendezvousil.com). The app opens to sign-in; schedule, chat, directory, and account tools unlock after Clerk login (same account as the website). Not a registration sales funnel — families get the app when they are attending.

## Features

| Area | Details |
|------|---------|
| **Sign-in gate** | Welcome screen → Clerk sheet → full app (Pew Packers pattern) |
| **Account** | Profile card, web dashboard / registration / password links, directory + notification shortcuts |
| **Home** | Greeting, now/next during retreat week, shortcuts to schedule / updates / chat / directory |
| **Schedule** | Native week view, meals, worship leaders, **per-event reminder** (bell icon) |
| **Updates** | Now/next, weather, announcements |
| **Chat** | Year cohort channels (Ably realtime when available; messages still load if Ably fails), retry + pull-to-refresh |
| **Notifications** | Local event reminders + **APNs** for organizer broadcasts |
| **Live Activity** | Lock Screen / Dynamic Island now & next during retreat week |
| **Directory** | Family photos + contact info; search, year picker, pull-to-refresh; **Your photo** toolbar → upload/compress/blurb/opt-out |
| **Staff check-in** | Check-In role — More → Check-in station |
| **Admin** | Dashboard + user management for Clerk admin roles |

## Requirements

- Xcode 16+ (iOS 17)
- Physical device for **remote APNs** testing (simulator supports local reminders + Live Activity preview)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen)
- **Clerk key** for staff sign-in (admin dashboard + check-in)

## Setup

After cloning (or if Xcode shows **No such module 'Clerk'**):

```bash
cd ios
bash scripts/setup-xcode.sh
open RendezvousIL.xcodeproj
```

That runs XcodeGen (adds Clerk + all Swift sources to the project), resolves Swift packages, and opens the **RendezvousIL** scheme.

- **Clerk sign-in** uses a Pew Packers–style flow: short copy + **Sign in or create account** button opens Clerk in a sheet (not a cramped inline form). Key is in `Config.xcconfig` → `RendezvousIL/Info.plist`.

```bash
cp Config.xcconfig.example Config.local.xcconfig
# optional: pk_test_… for sandbox-only local builds
```

App Store builds use `Config.xcconfig` — no extra setup on device.

### Troubleshooting

| Symptom | Fix |
|--------|-----|
| `No such module 'Clerk'` | `bash scripts/setup-xcode.sh` — the committed `.xcodeproj` can lag behind `project.yml` |
| Missing `.swiftmodule` / `.abi.json` errors | Same — cascading from Clerk; regenerate then **Product → Clean Build Folder** |
| `Could not resolve package dependencies` | `RESET_SPM=1 bash scripts/setup-xcode.sh`, quit Xcode, reopen |
| No **RendezvousIL** scheme | `xcodegen generate` (included in setup script) |

Then in Xcode:

1. **Signing** — select your Team on **RendezvousIL** and **RendezvousILWidgets** targets (simulator does not need a team).
2. **Capabilities** — entitlements include Push Notifications + App Group `group.com.rendezvousil.app`.
3. **App icon** — `AppIcon.appiconset` includes `AppIcon-1024.png` (from `public/rendezvous-logo.png`, same as the site header). To refresh after a logo change: `bash ios/scripts/sync-app-icon.sh`.
4. Run on device (⌘R).

## Admin access (Clerk)

Assign a role in **Clerk → Users → Public metadata**:

```json
{ "role": "admin" }
```

Roles: `admin`, `editor`, `viewer`, `checkin`. Any admin role unlocks **More → Admin dashboard** in the app. Full **admins** also get **More → User management** (native CRUD matching `/admin/users` on web). Check-in staff also get **Staff check-in**.

Native endpoints (Bearer session token from Clerk iOS SDK):

| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/me` | Role + permissions probe |
| `GET /api/admin/mobile/dashboard` | Dashboard stats for the native hub |
| `POST /api/auth/activity` | Last-seen ping (`platform: ios`, optional `appVersion`) — on sign-in, app foreground, every 5 min |
| `GET/POST/PATCH/DELETE /api/admin/users` | Admin user CRUD (Bearer token; full admin) |
| `POST /api/admin/users/:id/reset-password` | Set password or copy sign-in link |

## Notifications & widgets (user)

- **Event reminders:** Schedule → tap **bell** on any event → choose 5 min / 15 min / 1 hr before (or at start). Scheduled locally on device.
- **Retreat-wide alerts:** More → **Notifications & widgets** → enable organizer announcements (registers APNs token).
- **Live Activity:** Toggle in same screen; auto-starts during event week (May 3–7, 2027).
- **Widgets:** Long-press Home Screen → **Edit Widgets** → search “Rendezvous” (Next event, Now & next). Lock Screen widgets available too.

## Backend / APNs (deploy)

Server setup: [docs/APNS_SETUP.md](../docs/APNS_SETUP.md)

- `POST /api/push/register` — device token
- `POST /api/push/activity-register` — Live Activity push token
- `/api/push-notification` — APNs first, OneSignal fallback
- Turso tables: `ios_device_tokens`, `ios_activity_push_tokens`

## Refresh bundled schedule

```bash
cd ..  # repo root
npx tsx -e "import { scheduleData, LU_SCHEDULE_ITEMS } from './lib/schedule-data.ts'; const dayDates = { Monday: '2027-05-03', Tuesday: '2027-05-04', Wednesday: '2027-05-05', Thursday: '2027-05-06', Friday: '2027-05-07' }; console.log(JSON.stringify({ year: 2027, dateRange: 'May 3–7, 2027', location: 'Lake Williamson Christian Center, Carlinville, IL', draftNotice: 'Based on the 2026 schedule — may change slightly for 2027', days: scheduleData, dayDates, luItems: LU_SCHEDULE_ITEMS }))" > ios/RendezvousIL/Resources/schedule-fallback.json
```

## Project layout

```
ios/
├── Shared/                 # App + widget extension (schedule, App Group store)
├── RendezvousIL/           # Main app
├── RendezvousILWidgets/    # WidgetKit + Live Activity UI
└── project.yml
```
