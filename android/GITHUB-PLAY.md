# Google Play — Rendezvous IL (BraddCorp)

**Play package (`applicationId`):** `com.rendezvousil.braddcorp.app`  
(Same as iOS `PRODUCT_BUNDLE_IDENTIFIER`. Kotlin namespace stays `com.rendezvousil.app`.)

**Developer account:** BraddCorp Play Console (`adin@braddcorp.com`) — **not** CCOFC / Pew Packers.

## Status

| Item | Status |
|------|--------|
| Play listing | Exists — `com.rendezvousil.braddcorp.app` |
| Play CI service account | **Active** — `braddcorp-play-ci@braddcorp-play.iam.gserviceaccount.com` |
| SA JSON (local) | `~/.config/braddcorp-play/play-ci.json` |
| Upload keystore | `~/.config/rendezvous-il/ren-upload.jks` |
| Firebase Android app | `rendezvous-il-app` + package above (`google-services.json` gitignored) |
| First AAB | **Internal track draft** — versionCode **1** / 1.0.0 (2026-10-04) |
| Rollout | Finish Play “Set up your app” (listing, content rating, etc.), then promote internal draft → testers |

## Service account invite (required for API upload)

Play Console → **Users and permissions** → `braddcorp-play-ci@braddcorp-play.iam.gserviceaccount.com`

1. Must **not** stay on “Invite sent” only — open the user → **Account permissions** → enable **Admin** (or at least view + release) → **Save**.
2. **App permissions:** Rendezvous IL (+ Church Relay if shared).
3. If API still returns 403: **Remove user** → invite again (SA must exist in GCP first).

Smoke test:

```bash
python3 - <<'PY'
import json, urllib.request, urllib.error
from pathlib import Path
import sys
sys.path[:0] = [
  "/opt/homebrew/share/google-cloud-sdk/lib/third_party",
  "/Users/braddford/.config/gcloud/virtenv/lib/python3.14/site-packages",
]
from google.oauth2 import service_account
import google.auth.transport.requests
key = json.loads(Path.home().joinpath(".config/braddcorp-play/play-ci.json").read_text())
creds = service_account.Credentials.from_service_account_info(
    key, scopes=["https://www.googleapis.com/auth/androidpublisher"]
)
creds.refresh(google.auth.transport.requests.Request())
pkg = "com.rendezvousil.braddcorp.app"
url = f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{pkg}/edits"
req = urllib.request.Request(
    url, data=b"{}", method="POST",
    headers={"Authorization": f"Bearer {creds.token}", "Content-Type": "application/json"},
)
try:
    print(urllib.request.urlopen(req).read().decode())
except urllib.error.HTTPError as e:
    print(e.code, e.read().decode())
PY
```

Expect a JSON `edit` id (not 403).

## Build + upload

```bash
cd android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew :app:bundleRelease
bash scripts/upload-play-internal.sh
```

AAB: `app/build/outputs/bundle/release/app-release.aab`

Manual fallback: Play Console → Rendezvous IL → Testing → Internal testing → upload that AAB.
