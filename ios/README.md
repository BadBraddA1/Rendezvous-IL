# Rendezvous IL — iOS App

Native SwiftUI **attendee community hub** for [rendezvousil.com](https://rendezvousil.com). The app opens to sign-in; schedule, chat, directory, and account tools unlock after Clerk login (same account as the website). Not a registration sales funnel — families get the app when they are attending.

## Features

| Area | Details |
|------|---------|
| **Sign-in gate** | Welcome screen → Clerk sheet → full app (Pew Packers pattern) |
| **Account** | Profile card, web dashboard / registration / password links, directory + notification shortcuts |
| **Home** | Greeting, now/next during retreat week, shortcuts to schedule / map / chat / directory |
| **Map** | Hybrid: MapKit directions to Lake Williamson + on-campus image map (same pins as the website). Uses When-In-Use location to auto-switch when you arrive. Schedule locations open the matching pin. Blue-dot overlay is reserved for a later update. |
| **Chat** | Year cohort channels (Ably realtime when available; messages still load if Ably fails), retry + pull-to-refresh |
| **Schedule** (center tab) | Day schedule + live updates (now/next, weather, announcements), meals, worship leaders, event reminders |
| **Directory** | Family cards (tap for full details); disk cache then background refresh; search, year picker; **Your photo** toolbar |
| **Songs** | More → Songs — published Campfire / Racket Ball packs; opportunistic download to Documents by `content_hash`; offline PDFKit / Quick Look viewer with next/previous |
| **Notifications** | Local event reminders + **APNs** for organizer broadcasts, chat, and song-pack updates; photo messages show a lock-screen preview via **Notification Service Extension**; deep links from push open the right tab |
| **Live Activity** | Lock Screen / Dynamic Island now & next during retreat week |
| **Widgets** | Home/Lock Screen now/next; tap opens Schedule via `rendezvousil://schedule` |
| **CarPlay** | Driving-task list: today’s retreat schedule + **Directions to Lake Williamson** (Apple entitlement **approved** — enable on App ID + refresh profiles; see [docs/carplay/SETUP.md](docs/carplay/SETUP.md)) |
| **Staff check-in** | Check-In role — More → Check-in station (camera QR scan, code entry, search, keep-display-alive toggle, room keys, undo). **Planned:** remove name/email search; QR + code only. |
| **Admin** | Dashboard stats + quick links; user management CRUD for full admins (search, ban, password reset) |

**Event years in UI:** always use `YearFormatting.label(_:)` / `rendezvousTitle(_:)` in `Shared/YearFormatting.swift` (or `AppConfig.eventYearLabel`). Never put a raw `Int` year into SwiftUI `Text("… \(year)")` — `LocalizedStringKey` locale-formats it as `2,027`.

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

1. **Signing** — select your Team on **RendezvousIL**, **RendezvousILWidgets**, and **RendezvousILNotificationService** targets (simulator does not need a team).
2. **Capabilities** — entitlements include Push Notifications + App Group `group.com.rendezvousil.app`. Chat photo previews require the notification-service extension bundle id `com.rendezvousil.braddcorp.app.notification-service` (created by XcodeGen from `project.yml`).
3. **App icon** — `AppIcon.appiconset` includes `AppIcon-1024.png` (from `public/rendezvous-logo.png`, same as the site header). To refresh after a logo change: `bash ios/scripts/sync-app-icon.sh`.
4. Run on device (⌘R).

## TestFlight

### App Store listing (description, keywords, URLs)

Copy-paste fields for App Store Connect live in **[app-store/metadata.md](app-store/metadata.md)**:

| Field | Value |
| --- | --- |
| Marketing URL | https://rendezvousil.com |
| Support URL | https://rendezvousil.com/about |
| Privacy Policy URL | https://rendezvousil.com/privacy |
| Keywords | see metadata.md |
| Description | see metadata.md |

### App Store screenshots

From Terminal:

```bash
bash /Users/braddford/rendezvous-il/ios/scripts/capture-app-store-screenshots.sh
```

Or from `ios/`:

```bash
bash scripts/capture-app-store-screenshots.sh
```

Builds the app, runs demo mode on **iPhone 17 Pro Max**, writes PNGs to `ios/AppStoreScreenshots/`, and opens Finder. Upload under **Previews and Screenshots → iPhone 6.9" Display**.

**iPad (required if the app runs on iPad):**

```bash
bash scripts/capture-app-store-screenshots-ipad.sh
```

The iPad script uses **iPad Pro 13-inch** and writes to `ios/AppStoreScreenshots-iPad/` at **2064×2752** — upload under **Previews and Screenshots → iPad 13" Display**.

Uses `DEVELOPER_DIR` (defaults to `/Users/braddford/Downloads/Xcode-beta.app` when present). Opens **Simulator.app** when present, otherwise **DeviceHub.app** (Xcode 27). The script polls until each PNG exceeds ~200KB — `simctl io` often returns a blank ~80KB frame for several seconds after launch. Demo mode uses bundled schedule data and skips network/notifications.

If a frame is blank, recapture that tab in Xcode: scheme **Run → Arguments** → `-AppStoreScreenshots` and `-ScreenshotTab` (`welcome` / `home` / `schedule` / `chat` / `directory` / `more`), then **Simulator → File → Save Screen**.

### App Review chat demo

Launch flag (scheme → Arguments Passed On Launch):

```
-ChatDemo
```

Optional: `-ChatDemo ren-review-chat` (override; must match Vercel `CHAT_DEMO_CODE`).

Opens the app into Chat and loads **live** channels marked Test in Admin → Year Chat (add/edit messages there anytime). Code is baked in `Config.xcconfig` as `CHAT_DEMO_CODE`.

### Local upload

From `ios/`:

```bash
bash scripts/ship-testflight.sh
```

Archives Release, verifies Clerk key in the IPA, and uploads to App Store Connect. After processing, run the checklist in [TESTFLIGHT_SMOKE.md](TESTFLIGHT_SMOKE.md) on a physical device.

If you see **Upload limit reached**, Apple capped uploads for this app for ~24 hours (local and Xcode Cloud share that limit). Wait a day and try again.

### Xcode Cloud (recommended for day-to-day ships)

The repo already has `ios/ci_scripts/ci_post_clone.sh` (runs XcodeGen + optional Clerk key). One-time setup in Xcode:

1. Open `ios/RendezvousIL.xcodeproj` (run `bash scripts/setup-xcode.sh` first if needed).
2. **Product → Xcode Cloud → Create Workflow…** (or the cloud icon in the report navigator).
3. Sign in with the **Apple ID** that owns the App Store Connect app (`com.rendezvousil.braddcorp.app`).
4. Grant access to the **GitHub** repo (`BadBraddA1/Rendezvous-IL`) when prompted.
5. Workflow settings:
   - **Project / workspace:** `ios/RendezvousIL.xcodeproj` (not the monorepo root alone)
   - **Scheme:** `RendezvousIL`
   - **Actions:** Archive → **TestFlight Internal Testing** (or External if you use that group)
   - **Start condition:** Branch changes on `main`, and/or **Manual start**
6. **Environment** (optional): add secret `CLERK_PUBLISHABLE_KEY` only if you need to override `Config.xcconfig`. Production builds usually use the committed live key.
7. **Signing:** use **Automatically manage signing** with team **F5HPRRCC5H** (same as local). Xcode Cloud manages certificates/profiles in App Store Connect → Users and Access → Integrations → Xcode Cloud.

#### Pause / resume Cloud builds (gate file)

Edit **`ios/ci_scripts/xcode-cloud.env`**:

```bash
XCODE_CLOUD_BUILDS_ENABLED=0   # pause — ci_post_clone exits early (no archive/TestFlight)
XCODE_CLOUD_BUILDS_ENABLED=1   # allow Cloud builds again
```

Commit + push after flipping. While paused, pushes still start a Cloud run but it stops in **Post-Clone** with a clear “PAUSED” message (saves archive minutes).

One-off skip without editing the file: put **`[ci skip]`** in the commit message (Apple start-condition skip).

#### “Preparing build for App Store Connect failed”

Compile/archive usually **succeed**; the failure is **ASC auth during TestFlight prepare/upload**:

`Unable to authenticate with App Store Connect` / `Failed to find an account with App Store Connect access for team F5HPRRCC5H`

Fix in App Store Connect (not code):

1. **Users and Access → Integrations → Xcode Cloud** — confirm the product/repo link is healthy; reconnect GitHub if needed.
2. Ensure the Apple ID used for Xcode Cloud has **App Manager** (or Admin / Account Holder) on the Rendezvous IL app.
3. In Xcode: **Settings → Accounts** — re-sign the team, then **Product → Xcode Cloud → Manage Workflows** and start a **Manual** build once `XCODE_CLOUD_BUILDS_ENABLED=1`.

**Required App IDs** (Identifiers → App IDs), all team **F5HPRRCC5H**:

| Bundle ID | Purpose |
|-----------|---------|
| `com.rendezvousil.braddcorp.app` | Main app |
| `com.rendezvousil.braddcorp.app.widgets` | Widgets / Live Activities |
| `com.rendezvousil.braddcorp.app.notification-service` | Notification Service Extension (rich chat photo push) |

If export fails with `Automatic signing cannot register bundle identifier …notification-service`, create that App ID on [developer.apple.com/account](https://developer.apple.com/account/resources/identifiers/list) (or via App Store Connect API) and re-run the Cloud build. Archive can succeed while export fails when an extension App ID is missing.
8. Save, then **Start Build** (or push to `main` if you enabled that).

Bump `CURRENT_PROJECT_VERSION` in `ios/project.yml` before each ship (Cloud archives whatever is on the branch). After a green build, the build appears under **App Store Connect → TestFlight** like a local upload.

**Manual start later:** Xcode → Report navigator (speech bubble) → Cloud → select workflow → **Start Build**, or App Store Connect → Xcode Cloud.

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
