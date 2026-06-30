# Firebase Cloud Messaging (FCM)

The native Android app registers device tokens at `POST /api/push/register` with `platform: "android"`. Admin **Send Push Notification** in messaging uses **APNs** for iOS tokens and **FCM HTTP v1** for Android tokens (when configured), then falls back to OneSignal.

## 1. Firebase project setup

1. [Firebase Console](https://console.firebase.google.com) → create or open the Rendezvous IL project
2. **Add app** → Android → package name `com.rendezvousil.app` (match iOS bundle ID)
3. Download `google-services.json` into the Android app module (see `android/README.md`)
4. **Project settings** → **Service accounts** → **Generate new private key** (JSON)

The service account needs permission to send FCM messages (Firebase Admin SDK service account role is sufficient).

## 2. Vercel environment variables

Add to the production project:

| Variable | Example | Purpose |
|----------|---------|---------|
| `FCM_PROJECT_ID` | `rendezvous-il-abc123` | Firebase project ID |
| `FCM_SERVICE_ACCOUNT_JSON` | `{"type":"service_account",...}` | Full service account JSON (single line in Vercel) |

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
# Register Android token
curl -X POST https://rendezvousil.com/api/push/register \
  -H 'Content-Type: application/json' \
  -d '{"platform":"android","token":"YOUR_FCM_TOKEN","bundleId":"com.rendezvousil.app"}'

# Unregister
curl -X DELETE https://rendezvousil.com/api/push/register \
  -H 'Content-Type: application/json' \
  -d '{"platform":"android","token":"YOUR_FCM_TOKEN"}'
```

iOS clients omit `platform` (defaults to `"ios"`) — behavior unchanged.

## 5. Test broadcast

1. Install the Android app on a **physical device** and allow notifications
2. Confirm a row appears in `android_device_tokens`
3. Admin → Messaging → **Send Push Notification**
4. Or curl:

```bash
curl -X POST https://rendezvousil.com/api/push-notification \
  -H 'Content-Type: application/json' \
  -d '{"title":"Test","message":"FCM hello from Rendezvous"}'
```

Response `channel: "fcm"` confirms the FCM path. When both iOS and Android tokens are registered, expect `channel: "apns+fcm"` with per-platform counts.

## 6. What uses what

| Feature | Mechanism |
|---------|-----------|
| User event reminders | **Local** notifications on device |
| Organizer broadcasts (iOS) | **APNs** via `/api/push-notification` |
| Organizer broadcasts (Android) | **FCM HTTP v1** via `/api/push-notification` |
| PWA / legacy web push | **OneSignal** fallback |
