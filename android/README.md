# Rendezvous IL — Android App

Native Kotlin + Jetpack Compose companion for [rendezvousil.com](https://rendezvousil.com).

**Phase 1** covers public, unauthenticated features. **Phase 2** adds Clerk auth, family account, and directory.

## Requirements

- Android Studio Ladybug (2024.2+) or newer
- JDK 17
- Android SDK with API 35

## Setup

```bash
cd android
cp local.properties.example local.properties   # set sdk.dir; optional BASE_URL / CLERK_PUBLISHABLE_KEY
```

Open the `android/` folder in Android Studio and sync Gradle.

Default API base URL: **`https://rendezvousil.com`** (override via `BASE_URL` in `local.properties`).

**Clerk auth (Phase 2):** copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` from the repo root `.env.local` into `local.properties`:

```properties
CLERK_PUBLISHABLE_KEY=pk_test_...
```

If the key is missing, the app still runs in public-only mode and `AppSession.clerkSetupError` explains what to add.

For local Next.js dev against the emulator:

```properties
BASE_URL=http://10.0.2.2:3000
```

Debug builds allow cleartext HTTP via `app/src/debug/AndroidManifest.xml`.

## Gradle wrapper

The repo includes `gradlew` / `gradle-wrapper.properties` (Gradle **8.11.1**). If the wrapper scripts are missing, regenerate from the `android/` directory:

```bash
gradle wrapper --gradle-version 8.11.1
```

## Build

```bash
cd android
./gradlew :app:assembleDebug
```

CI assemble is **manual only** (`workflow_dispatch` on `.github/workflows/android-build.yml`) so failed Actions runs don’t spam GitHub notifications on every push.

## Refresh bundled schedule

From repo root or `android/`:

```bash
bash android/scripts/sync-schedule-fallback.sh
```

Generates `app/src/main/assets/schedule-fallback.json` from `lib/schedule-data.ts` (same command as [ios/README.md](../ios/README.md)). Falls back to copying `ios/RendezvousIL/Resources/schedule-fallback.json` if `tsx` fails.

## Phase 1 features ✅

| Area | Details |
|------|---------|
| **Shell** | 5 tabs: Home, Chat, Schedule, Directory, More (Updates via Home/More) |
| **Schedule** | Day picker, meals, volunteer slots, schedule announcements, offline fallback JSON |
| **Updates** | Now/next (America/Chicago), weather, live announcements |
| **Public pages** | FAQ, About, Bible Bowl, cost calculator (same logic as iOS/web) |
| **HTTP** | Retrofit + kotlinx.serialization; User-Agent `RendezvousIL-Android/1.0` |
| **CI** | GitHub Action assembles debug APK on `android/**` changes |

## Phase 2 — Auth + family ✅

| Area | Details |
|------|---------|
| **Clerk** | `clerk-android-ui` 1.0.31; `CLERK_PUBLISHABLE_KEY` in `local.properties` / BuildConfig |
| **AppSession** | `com.rendezvousil.app.auth.AppSession` — signed-in state, admin flags, bearer `ApiClient` |
| **Account** | `AccountScreen` — `AuthView` sign-in/out, web links (`BuildConfig.BASE_URL`), directory nav |
| **Directory** | Browse by year + search; photo upload/replace/remove, opt-out, blurb (Coil + multipart `photo`) |
| **More tab** | Account section: Family account, Family directory, Directory photo |
| **API** | `GET /api/admin/me`, `POST /api/auth/activity`, directory endpoints |
| **Activity** | Ping on sign-in, `ON_RESUME`, and every 5 minutes while signed in |

## Phase 3 — Home screen widgets ✅

| Area | Details |
|------|---------|
| **Module** | `:widgets` — Glance App Widget library merged into the app APK |
| **Widgets** | **Next event** (2×2 small) and **Now & next** (4×2 medium), mirroring iOS `NextEventWidget` + `NowNextWidget` |
| **Snapshot** | `SharedScheduleSnapshot` in `:core:schedule`; persisted JSON via `ScheduleSnapshotStore` (SharedPreferences) |
| **Publish** | `RendezvousRepository` calls `onScheduleSynced` after schedule load/fallback; `ScheduleSnapshotPublisher` saves + `WidgetRefresh.updateAll` |
| **Refresh** | Immediate refresh on snapshot save; widgets also request updates every 15 minutes (`updatePeriodMillis`) |

### Add widgets on a device

1. Build and install: `./gradlew :app:installDebug`
2. Long-press the home screen → **Widgets**
3. Find **Rendezvous IL** (or search “Rendezvous”)
4. Drag **Next event** (small) or **Now & next** (medium) onto the home screen
5. Open the app once (Schedule or Updates tab) so the schedule snapshot is written; widgets update automatically after that

Snapshot prefs: `com.rendezvousil.app.schedule` / key `schedule_snapshot` (app-private).

## Phase 3b — Notifications + deep links ✅

| Area | Details |
|------|---------|
| **Event reminders** | Offsets mirror iOS (`EventReminderOffset`: at start, 5/15/30/60 min); `AlarmManager` + `ReminderReceiver`; prefs in DataStore |
| **FCM** | `RendezvousFirebaseMessagingService`; register/unregister at `POST/DELETE /api/push/register` with `platform: "android"` |
| **Settings** | More → **Notifications & widgets** (`NotificationSettingsScreen`) |
| **Schedule bell** | Tap bell on events with a matching `luItem` → `EventReminderSheet` bottom sheet |
| **Deep link** | `rendezvousil://schedule` → Schedule tab (`MainActivity` intent filter) |
| **Permissions** | `POST_NOTIFICATIONS` (Android 13+), `SCHEDULE_EXACT_ALARM` for on-time reminders |

### Firebase setup

1. Create an Android app in the [Firebase console](https://console.firebase.google.com/) with package **`com.rendezvousil.app`**.
2. Download `google-services.json` and place it at **`android/app/google-services.json`** (gitignored — do not commit).
3. Copy `android/app/google-services.json.example` as a reference if needed.
4. Sync Gradle; the Google Services plugin applies automatically when the file is present.

**Without `google-services.json`:** optional manual init via `local.properties` (Firebase console → Project settings):

```properties
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_APP_ID=1:123456789:android:abcdef
FIREBASE_API_KEY=AIza...
FIREBASE_GCM_SENDER_ID=123456789
```

Local event reminders work without Firebase. FCM broadcast alerts require Firebase configuration.

## Phase 4 — Staff + admin ✅

| Area | Details |
|------|---------|
| **More → Admin** | Role-gated section: Admin dashboard (`canViewDashboard`), User management (`canManageUsers`), Staff check-in (`canCheckIn`) |
| **Admin dashboard** | `AdminDashboardScreen` — stats, registration progress, lodging mix, action items, pull-to-refresh; web fallback for deep admin links |
| **Staff check-in** | `CheckInScreen` — QR/code lookup, name/email search, family + keys + t-shirts, check-in/undo; optional CameraX QR scan (`QrScanActivity`) |
| **User management** | `AdminUsersScreen` — list, search, pull-to-refresh, create sheet, detail sheet (role, ban, delete, reset password / sign-in link) |
| **API** | `GET /api/admin/mobile/dashboard`, check-in registration routes, `GET/POST/PATCH/DELETE /api/admin/users`, `POST .../reset-password` via `ApiClient` |

## Phase 5 — Year chat ✅

Core chat parity with iOS/web (CarPlay remains iOS-only):

| Area | Details |
|------|---------|
| **Tabs** | Bottom bar: Home (live day board), **Chat**, Schedule, **Directory**, More — same primary surfaces as iOS |
| **Volunteering** | Home card + More → Your volunteering via `GET /api/family/volunteering` (hidden when empty); auto local reminder 30m before each assignment |
| **Chat list** | `ChatListScreen` — channels from `GET /api/chat/channels`, newest activity first, unread badges, pull-to-refresh |
| **Thread** | `ChatThreadScreen` — messages, send text, up to 6 photos (multipart), polls + announcements (mods), reactions (`🦙👍❤️😂🙏` behind smile menu), delete own/mod |
| **Realtime** | `AblyChatService` — `POST /api/ably/token`, channel `rendezvous:channel:{id}`, events `message` / `message_deleted` / `reaction` / `poll_updated`; HTTP poll every 4s if Ably fails |
| **Cache** | `ChatDataStore` — channels + per-thread messages on disk; show cache first, refresh in background |
| **Photos** | Tap a chat photo to open full-screen viewer |
| **API** | `ApiClient` chat helpers + DTOs in `core/network/.../dto/ChatDtos.kt` |
| **Deps** | `io.ably:ably-android` (Pub/Sub, not `@ably/chat`) |
| **Directory** | Address opens Maps; phones under member names with Call / Text |
| **Schedule** | Refreshes on app resume so admin edits appear without force-stop; “happening now” only for the in-progress Central Time event |
| **Directory** | Disk cache (`DirectoryDataStore`) shows last list instantly, then refreshes in background |

## Project layout

```
android/
├── app/                    # Compose UI, navigation, ViewModels
├── widgets/                # Glance home screen widgets (Phase 3)
├── core/
│   ├── network/            # Retrofit, OkHttp, User-Agent interceptor
│   └── schedule/           # Pure Kotlin schedule models + logic (Phase 1)
├── scripts/
│   └── sync-schedule-fallback.sh
├── gradle/
│   └── libs.versions.toml  # Version catalog
└── settings.gradle.kts     # :app, :core:network, :core:schedule, :widgets
```

Package: `com.rendezvousil.app` · minSdk **26** · targetSdk **35** · compileSdk **36** · AGP **8.9.1** · Kotlin **2.4.10**
