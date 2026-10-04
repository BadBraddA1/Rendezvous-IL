#!/usr/bin/env bash
# Upload Ren release AAB to BraddCorp Play internal testing track.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AAB="${AAB:-$ROOT/app/build/outputs/bundle/release/app-release.aab}"
PACKAGE="${PACKAGE:-com.rendezvousil.braddcorp.app}"
TRACK="${TRACK:-internal}"
SA_JSON="${PLAY_SERVICE_ACCOUNT_JSON:-$HOME/.config/braddcorp-play/play-ci.json}"

if [[ ! -f "$AAB" ]]; then
  echo "Missing AAB: $AAB" >&2
  echo "Build first: JAVA_HOME=... ./gradlew :app:bundleRelease" >&2
  exit 1
fi
if [[ ! -f "$SA_JSON" ]]; then
  echo "Missing Play SA JSON: $SA_JSON" >&2
  exit 1
fi

export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"

python3 - <<PY
import json, mimetypes, sys, time, urllib.request, urllib.error
from pathlib import Path

sys.path[:0] = [
    "/opt/homebrew/share/google-cloud-sdk/lib/third_party",
    str(Path.home() / ".config/gcloud/virtenv/lib/python3.14/site-packages"),
]
from google.oauth2 import service_account
import google.auth.transport.requests

package = "$PACKAGE"
track = "$TRACK"
aab_path = Path("$AAB")
sa_path = Path("$SA_JSON")

creds = service_account.Credentials.from_service_account_file(
    str(sa_path),
    scopes=["https://www.googleapis.com/auth/androidpublisher"],
)
creds.refresh(google.auth.transport.requests.Request())
auth = {"Authorization": f"Bearer {creds.token}"}

def req(method, url, data=None, headers=None, raw=False):
    h = dict(auth)
    if headers:
        h.update(headers)
    body = data if (raw or data is None or isinstance(data, (bytes, bytearray))) else json.dumps(data).encode()
    if data is not None and not raw and not isinstance(data, (bytes, bytearray)):
        h.setdefault("Content-Type", "application/json")
    r = urllib.request.Request(url, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(r) as resp:
            raw_body = resp.read()
            if not raw_body:
                return {}
            return json.loads(raw_body.decode())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        raise SystemExit(f"{method} {url} -> {e.code}\n{err}")

base = f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{package}"
edit = req("POST", f"{base}/edits", {})
edit_id = edit["id"]
print(f"edit {edit_id}")

# Upload AAB (media upload)
upload_url = (
    f"https://androidpublisher.googleapis.com/upload/androidpublisher/v3/"
    f"applications/{package}/edits/{edit_id}/bundles?uploadType=media"
)
aab_bytes = aab_path.read_bytes()
bundle = req(
    "POST",
    upload_url,
    data=aab_bytes,
    headers={"Content-Type": "application/octet-stream"},
    raw=True,
)
version_code = bundle.get("versionCode")
print(f"uploaded versionCode={version_code}")

req(
    "PUT",
    f"{base}/edits/{edit_id}/tracks/{track}",
    {
        "track": track,
        "releases": [
            {
                "name": f"{version_code}",
                "status": "completed",
                "versionCodes": [str(version_code)],
            }
        ],
    },
)
commit = req("POST", f"{base}/edits/{edit_id}:commit", {})
print("committed", json.dumps(commit)[:300])
print(f"OK — {package} versionCode {version_code} on track '{track}'")
PY
