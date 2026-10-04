#!/usr/bin/env bash
# Upload Ren release AAB to BraddCorp Play internal testing track.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AAB="${AAB:-$ROOT/app/build/outputs/bundle/release/app-release.aab}"
PACKAGE="${PACKAGE:-com.rendezvousil.braddcorp.app}"
TRACK="${TRACK:-internal}"
STATUS="${STATUS:-completed}" # draft | completed
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
import json, sys
from pathlib import Path

sys.path[:0] = [
    "/opt/homebrew/share/google-cloud-sdk/lib/third_party",
    str(Path.home() / ".config/gcloud/virtenv/lib/python3.14/site-packages"),
]
from google.oauth2 import service_account
import google.auth.transport.requests
import urllib.request
import urllib.error

package = "$PACKAGE"
track = "$TRACK"
status = "$STATUS"
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
    body = None
    if data is not None:
        if raw or isinstance(data, (bytes, bytearray)):
            body = data
        else:
            body = json.dumps(data).encode()
            h.setdefault("Content-Type", "application/json")
    r = urllib.request.Request(url, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(r) as resp:
            raw_body = resp.read()
            return json.loads(raw_body.decode()) if raw_body else {}
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        raise SystemExit(f"{method} {url} -> {e.code}\n{err}")

base = f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{package}"
edit = req("POST", f"{base}/edits", {})
edit_id = edit["id"]
print(f"edit {edit_id}")

upload_url = (
    f"https://androidpublisher.googleapis.com/upload/androidpublisher/v3/"
    f"applications/{package}/edits/{edit_id}/bundles?uploadType=media"
)
bundle = req(
    "POST",
    upload_url,
    data=aab_path.read_bytes(),
    headers={"Content-Type": "application/octet-stream"},
    raw=True,
)
version_code = int(bundle["versionCode"])
print(f"uploaded versionCode={version_code}")

# First-time / policy-sensitive commits: start as draft, then promote.
# Integer versionCodes (not strings) — string lists can trigger bogus Play errors.
req(
    "PUT",
    f"{base}/edits/{edit_id}/tracks/{track}",
    {
        "track": track,
        "releases": [
            {
                "name": f"{version_code}",
                "status": "draft" if status == "completed" else status,
                "versionCodes": [version_code],
            }
        ],
    },
)
req("POST", f"{base}/edits/{edit_id}:commit", {})
print(f"committed draft on '{track}'")

if status == "completed":
    edit2 = req("POST", f"{base}/edits", {})
    eid2 = edit2["id"]
    cur = req("GET", f"{base}/edits/{eid2}/tracks/{track}")
    releases = cur.get("releases") or []
    for rel in releases:
        if str(version_code) in [str(v) for v in rel.get("versionCodes", [])] or int(version_code) in [
            int(v) for v in rel.get("versionCodes", [])
        ]:
            rel["status"] = "completed"
            rel["versionCodes"] = [int(v) for v in rel["versionCodes"]]
    req("PUT", f"{base}/edits/{eid2}/tracks/{track}", {"track": track, "releases": releases})
    req("POST", f"{base}/edits/{eid2}:commit", {})
    print(f"OK — {package} versionCode {version_code} completed on track '{track}'")
else:
    print(f"OK — {package} versionCode {version_code} draft on track '{track}'")
PY
