# Apple Push Notifications (APNs)

The native iOS app registers device tokens at `POST /api/push/register`. Admin **Send Push Notification** in messaging uses **APNs first** (when configured), then falls back to OneSignal.

## 1. Apple Developer setup

1. [Apple Developer](https://developer.apple.com) → **Certificates, Identifiers & Profiles**
2. **Identifiers** → App ID `com.rendezvousil.braddcorp.app`
   - Enable **Push Notifications**
   - Enable **App Groups** → `group.com.rendezvousil.app`
3. Create an **APNs Auth Key** (.p8) — note **Key ID** and **Team ID**
4. For Live Activities: same key works for ActivityKit push updates

## 2. Xcode capabilities

Already in `ios/RendezvousIL/RendezvousIL.entitlements`:

- `aps-environment` — `development` for debug; Xcode sets `production` for App Store archive
- App Group `group.com.rendezvousil.app`

Widget extension uses the same App Group (no `aps-environment` — widgets don't receive device pushes directly).

## 3. Vercel environment variables

Add to project `v0-ren`:

| Variable | Example | Purpose |
|----------|---------|---------|
| `APNS_KEY_ID` | `AB12CD34EF` | Auth Key ID |
| `APNS_TEAM_ID` | `XXXXXXXXXX` | Apple Team ID |
| `APNS_AUTH_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | Full .p8 contents (use `\n` for newlines in Vercel) |
| `APNS_BUNDLE_ID` | `com.rendezvousil.braddcorp.app` | Must match the iOS app bundle id |
| `APNS_ENVIRONMENT` | `production` or `sandbox` | Must match build (TestFlight/App Store = `production`) |

Alternative: `APNS_KEY_PATH` for local dev only (path to .p8 file).

## 4. Database tables

Run on Turso (or apply `scripts/schema-turso.sql`):

- `ios_device_tokens` — APNs device tokens from the app
- `ios_activity_push_tokens` — Live Activity push-to-update tokens

```bash
pnpm db:verify   # confirm tables exist after migration
```

## 5. What uses what

| Feature | Mechanism |
|---------|-----------|
| User event reminders | **Local** notifications scheduled on device (Schedule → bell icon) |
| Organizer broadcasts | **APNs** via `/api/push-notification` |
| Live Activity lock screen | **ActivityKit** on device; optional server updates via activity push tokens |
| Home / Lock Screen widgets | **WidgetKit** reading App Group snapshot |

## 6. Test push

1. Install app on a **physical device** (simulator does not receive remote APNs)
2. Allow notifications → token registers automatically
3. Admin → Messaging → enable **Send Push Notification**
4. Or curl:

```bash
curl -X POST https://rendezvousil.com/api/push-notification \
  -H 'Content-Type: application/json' \
  -d '{"title":"Test","message":"APNs hello from Rendezvous"}'
```

Response `channel: "apns"` confirms APNs path.
