# Firebase Cloud Messaging (FCM)

The native Android app registers device tokens at `POST /api/push/register` with `platform: "android"`. Admin **Send Push Notification** in messaging uses **APNs** for iOS tokens and **FCM HTTP v1** for Android tokens (when configured), then falls back to OneSignal.

## BraddCorp status (2026-09)

| Piece | Value |
| --- | --- |
| Google account | `adin@braddcorp.com` |
| Firebase project | **`rendezvous-il-app`** |
| Android package | `com.rendezvousil.braddcorp.app` (matches Apple / Play) |
| Local config | `android/app/google-services.json` (gitignored) |
| Vercel (production) | `FCM_PROJECT_ID` + `FCM_SERVICE_ACCOUNT_JSON` (set; production redeployed) |
| Service account key (local ops) | `~/.config/braddcorp-ops/rendezvous-il-fcm-sa.json` (never commit) |

## 1. Firebase project setup

Already provisioned under BraddCorp. To recreate on another machine:

1. [Firebase Console](https://console.firebase.google.com) → project **`rendezvous-il-app`**
2. Android app package `com.rendezvousil.braddcorp.app`
3. Download `google-services.json` → `android/app/google-services.json`
4. Service account with `roles/firebase.admin` (or use existing `fcm-send@rendezvous-il-app.iam.gserviceaccount.com`)

## 2. Vercel environment variables

Production (v0-ren) expects:

| Variable | Example | Purpose |
|----------|---------|---------|
| `FCM_PROJECT_ID` | `rendezvous-il-app` | Firebase project ID |
| `FCM_SERVICE_ACCOUNT_JSON` | `{"type":"service_account",...}` | Full service account JSON (single line) |

**Alternative** (split credentials):

| Variable | Purpose |
|----------|---------|
| `FCM_CLIENT_EMAIL` | `firebase-adminsdk-...@....iam.gserviceaccount.com` |
| `FCM_PRIVATE_KEY` | PEM private key (`\n` for newlines in Vercel) |

Use either `FCM_SERVICE_ACCOUNT_JSON` **or** `FCM_CLIENT_EMAIL` + `FCM_PRIVATE_KEY`.

## 3. Database table

Run on Turso (or apply `scripts/schema-turso.sql`):

- `android_device_tokens` — FCM registration tokens from the Android app

```bash
pnpm db:verify   # confirm tables exist after migration
```

## 4. Register / unregister API

```bash
# Register Android token (app does this after permission + FCM init)
curl -X POST https://rendezvousil.com/api/push/register \
  -H 'Content-Type: application/json' \
  -d '{"platform":"android","token":"YOUR_FCM_TOKEN","bundleId":"com.rendezvousil.braddcorp.app"}'

# Unregister
curl -X DELETE https://rendezvousil.com/api/push/register \
  -H 'Content-Type: application/json' \
  -d '{"platform":"android","token":"YOUR_FCM_TOKEN"}'
```

iOS clients omit `platform` (defaults to `"ios"`) — behavior unchanged.

## 5. Test broadcast

1. Install the Android debug APK with `google-services.json` present; allow notifications
2. **Sign in** (required — chat / targeted FCM filters on `clerk_user_id`)
3. More → **Notifications & widgets** → enable broadcast alerts
4. Confirm a row appears in `android_device_tokens` **with** `clerk_user_id` set
5. Admin → Messaging → **Send Push Notification** (or Announcements with push), or send a chat message to that user
6. Or curl (broadcast — all active Android tokens):

```bash
curl -X POST https://rendezvousil.com/api/push-notification \
  -H 'Content-Type: application/json' \
  -d '{"title":"Test","message":"FCM hello from Rendezvous"}'
```

Response `channel: "fcm"` (or `apns+fcm`) confirms the path.

**Chat pushes** only go to tokens with a matching `clerk_user_id`. Registration must use the signed-in API client (fixed 2026-10).

## 6. What uses what

| Feature | Mechanism |
|---------|-----------|
| User event reminders | **Local** notifications on device |
| Organizer broadcasts (iOS) | **APNs** via `/api/push-notification` |
| Organizer broadcasts (Android) | **FCM HTTP v1** via `/api/push-notification` |
| PWA / legacy web push | **OneSignal** fallback |
