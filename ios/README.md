# Rendezvous IL — iOS App

Native SwiftUI companion for [rendezvousil.com](https://rendezvousil.com).

## Features

| Area | Details |
|------|---------|
| **Schedule** | Native week view, meals, worship leaders, **per-event reminder** (bell icon) |
| **Updates** | Now/next, weather, announcements |
| **Notifications** | Local event reminders + **APNs** for organizer broadcasts |
| **Live Activity** | Lock Screen / Dynamic Island now & next during retreat week |
| **Staff check-in** | Check-In role on web (`/admin/checkin`) and in-app (More → Staff check-in) with Clerk sign-in |

## Requirements

- Xcode 16+ (iOS 17)
- Physical device for **remote APNs** testing (simulator supports local reminders + Live Activity preview)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen)

## Setup

```bash
cd ios
xcodegen generate
open RendezvousIL.xcodeproj
```

1. **Signing** — select your Team on **RendezvousIL** and **RendezvousILWidgets** targets.
2. **Capabilities** — entitlements include Push Notifications + App Group `group.com.rendezvousil.app`.
3. **App icon** — `AppIcon.appiconset` includes `AppIcon-1024.png` (from `public/rendezvous-favicon.jpg`). To refresh after a favicon change: `bash ios/scripts/sync-app-icon.sh`.
4. Run on device (⌘R).

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
